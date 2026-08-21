import type { IncomingMessage, ServerResponse } from "node:http";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MAX_QUERY_LENGTH = 80;
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const resultCache = new Map<string, { expiresAt: number; value: PublicPlaceResult }>();
const rateWindows = new Map<string, number[]>();

interface NominatimSearchResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

interface PublicPlaceResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function placeSearchHandler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "GET 요청만 지원합니다.", code: "METHOD_NOT_ALLOWED" });
    return;
  }

  const requestUrl = new URL(request.url ?? "/", "https://d-ha.vercel.app");
  const query = cleanQuery(requestUrl.searchParams.get("q") ?? "");
  if (!query) {
    sendJson(response, 400, { error: "장소 이름을 입력해주세요.", code: "QUERY_REQUIRED" });
    return;
  }
  enforceRateLimit(clientKey(request), response);
  if (response.writableEnded) return;

  const cacheKey = query.toLocaleLowerCase("ko-KR");
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    sendJson(response, 200, cached.value);
    return;
  }

  const upstreamUrl = new URL(NOMINATIM_ENDPOINT);
  upstreamUrl.searchParams.set("q", query);
  upstreamUrl.searchParams.set("format", "jsonv2");
  upstreamUrl.searchParams.set("limit", "1");
  upstreamUrl.searchParams.set("addressdetails", "1");
  upstreamUrl.searchParams.set("accept-language", "ko");

  try {
    const upstream = await fetchWithTimeout(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "ko",
        "User-Agent": "Diha/1.0 (+https://d-ha.vercel.app/support)"
      }
    }, 8_000);
    if (!upstream.ok) {
      sendJson(response, 502, { error: "지도 검색 서비스에 연결하지 못했어요.", code: "UPSTREAM_FAILED" });
      return;
    }
    const results = await upstream.json() as NominatimSearchResult[];
    const first = Array.isArray(results) ? results[0] : undefined;
    if (!first) {
      sendJson(response, 404, { error: "장소를 찾지 못했어요.", code: "PLACE_NOT_FOUND" });
      return;
    }
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!validCoordinates(latitude, longitude)) {
      sendJson(response, 502, { error: "지도 검색 결과를 확인하지 못했어요.", code: "INVALID_UPSTREAM_RESPONSE" });
      return;
    }
    const result: PublicPlaceResult = {
      latitude,
      longitude,
      displayName: cleanDisplayName(first.display_name) || query
    };
    rememberResult(cacheKey, result);
    sendJson(response, 200, result);
  } catch {
    sendJson(response, 502, { error: "지도 검색 서비스에 연결하지 못했어요.", code: "UPSTREAM_FAILED" });
  }
}

function cleanQuery(value: string): string {
  return stripControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

function cleanDisplayName(value: unknown): string {
  return typeof value === "string" ? stripControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, 240) : "";
}

function stripControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("");
}

function validCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function clientKey(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || request.socket?.remoteAddress || "anonymous";
}

function enforceRateLimit(key: string, response: ServerResponse): void {
  const now = Date.now();
  const recent = (rateWindows.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 30) {
    sendJson(response, 429, { error: "장소 검색이 잠시 몰렸어요. 잠시 후 다시 시도해주세요.", code: "RATE_LIMITED" });
    return;
  }
  recent.push(now);
  rateWindows.set(key, recent);
}

function rememberResult(key: string, value: PublicPlaceResult): void {
  if (resultCache.size >= 200) resultCache.delete(resultCache.keys().next().value ?? "");
  resultCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchWithTimeout(input: string | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status;
  response.end(JSON.stringify(payload));
}
