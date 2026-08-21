import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultSave } from "../domain/defaults";
import { petResearchHandler } from "../../server/petResearch";

const originalNvidiaApiKey = process.env.NVIDIA_API_KEY;

afterEach(() => {
  if (originalNvidiaApiKey === undefined) delete process.env.NVIDIA_API_KEY;
  else process.env.NVIDIA_API_KEY = originalNvidiaApiKey;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("펫 연구원 서버 개인화", () => {
  it("검증된 Firebase UID의 문서만 읽고 저장 기록을 AI 컨텍스트로 사용한다", async () => {
    process.env.NVIDIA_API_KEY = "test-nvidia-key";
    const base = createDefaultSave(new Date("2026-08-22T05:00:00.000Z"));
    const save = {
      ...base,
      profile: { ...base.profile, name: "복돌이" },
      petMedical: { ...base.petMedical, microchipId: "DO-NOT-SEND-410", hospital: { ...base.petMedical.hospital, patientNumber: "DO-NOT-SEND-PATIENT" } },
      petMemories: [{ id: "memory-1", title: "제주도 가족여행", memoryDate: "2026-06-01", note: "가족들과 제주 바다를 걸었어요.", photoDataUrl: "data:image/jpeg;base64,DO-NOT-SEND-PHOTO", createdAt: "2026-06-01T00:00:00.000Z" }],
      petExplorations: [{ id: "place-1", placeName: "서울숲", visitDate: "2026-08-01", note: "주말 산책", latitude: 37.5444, longitude: 127.0374, route: [], distanceMeters: 0, durationSeconds: 0, createdAt: "2026-08-01T00:00:00.000Z" }]
    };
    let nvidiaPrompt = "";
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("identitytoolkit.googleapis.com")) {
        return jsonResponse({ users: [{ localId: "uid-account-a" }] });
      }
      if (url.includes("firestore.googleapis.com")) {
        expect(init?.headers).toMatchObject({ Authorization: "Bearer valid-user-token" });
        return jsonResponse({ fields: {
          ownerId: { stringValue: "uid-account-a" },
          schemaVersion: { integerValue: "7" },
          save: firestoreValue(save)
        } });
      }
      if (url.endsWith("/chat/completions")) {
        const requestBody = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
        nvidiaPrompt = requestBody.messages.at(-1)?.content ?? "";
        return jsonResponse({ choices: [{ message: { content: "네, 복돌이는 서울숲을 자주 산책했고 제주도에서 가족여행을 했어요." } }] });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const request = {
      method: "POST",
      headers: { authorization: "Bearer valid-user-token" },
      body: { question: "헤더, 복돌이는 어디를 가봤어?", pet: { name: "가짜이름", species: "cat", breed: "siamese" } }
    } as unknown as IncomingMessage;
    const output = responseCapture();

    await petResearchHandler(request, output.response);

    const responseBody = JSON.parse(output.body()) as { answer: string; personalized: boolean };
    expect(output.response.statusCode).toBe(200);
    expect(responseBody.personalized).toBe(true);
    expect(responseBody.answer).toContain("서울숲");
    expect(requestedUrls).toContain("https://firestore.googleapis.com/v1/projects/d-ha-game/databases/(default)/documents/users/uid-account-a/game/primary");
    expect(requestedUrls.some((url) => url.includes("openalex") || url.includes("europepmc"))).toBe(false);
    expect(nvidiaPrompt).toContain("복돌이");
    expect(nvidiaPrompt).toContain("서울숲");
    expect(nvidiaPrompt).toContain("제주도 가족여행");
    expect(nvidiaPrompt).not.toContain("가짜이름");
    expect(nvidiaPrompt).not.toContain("DO-NOT-SEND-410");
    expect(nvidiaPrompt).not.toContain("DO-NOT-SEND-PATIENT");
    expect(nvidiaPrompt).not.toContain("DO-NOT-SEND-PHOTO");
    expect(nvidiaPrompt).not.toContain("37.5444");
  });
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

function firestoreValue(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, firestoreValue(nested)])) } };
  }
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { nullValue: null };
}

function responseCapture(): { response: ServerResponse; body: () => string } {
  let responseBody = "";
  const response = {
    statusCode: 200,
    setHeader: vi.fn(),
    end: (content?: string) => { responseBody = content ?? ""; }
  } as unknown as ServerResponse;
  return { response, body: () => responseBody };
}
