import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { placeSearchHandler } from "../../server/placeSearch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("장소 이름 자동 검색 서버", () => {
  it("사용자 장소 이름을 Nominatim에서 찾아 안전한 좌표만 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      lat: "37.5088730",
      lon: "126.9939435",
      display_name: "반포한강공원, 서초구, 서울특별시, 대한민국"
    }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = {
      method: "GET",
      url: "/api/place-search?q=%EB%B0%98%ED%8F%AC%ED%95%9C%EA%B0%95%EA%B3%B5%EC%9B%90",
      headers: { "x-forwarded-for": "198.51.100.27" },
      socket: {}
    } as unknown as IncomingMessage;
    const output = responseCapture();

    await placeSearchHandler(request, output.response);

    expect(output.response.statusCode).toBe(200);
    expect(JSON.parse(output.body())).toEqual({
      latitude: 37.508873,
      longitude: 126.9939435,
      displayName: "반포한강공원, 서초구, 서울특별시, 대한민국"
    });
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(upstreamUrl.origin + upstreamUrl.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(upstreamUrl.searchParams.get("q")).toBe("반포한강공원");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      "User-Agent": "Diha/1.0 (+https://d-ha.vercel.app/support)"
    });
  });

  it("검색 결과가 없으면 404를 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));
    const request = {
      method: "GET",
      url: "/api/place-search?q=%EC%B0%BE%EC%9D%84%EC%88%98%EC%97%86%EB%8A%94%EC%9E%A5%EC%86%8C",
      headers: { "x-forwarded-for": "198.51.100.28" },
      socket: {}
    } as unknown as IncomingMessage;
    const output = responseCapture();

    await placeSearchHandler(request, output.response);

    expect(output.response.statusCode).toBe(404);
    expect(JSON.parse(output.body())).toMatchObject({ code: "PLACE_NOT_FOUND" });
  });
});

function responseCapture(): { response: ServerResponse; body: () => string } {
  let responseBody = "";
  let ended = false;
  const response = {
    statusCode: 200,
    setHeader: vi.fn(),
    get writableEnded() { return ended; },
    end: (content?: string) => {
      responseBody = content ?? "";
      ended = true;
    }
  } as unknown as ServerResponse;
  return { response, body: () => responseBody };
}
