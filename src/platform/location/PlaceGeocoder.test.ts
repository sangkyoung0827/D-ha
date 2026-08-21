import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenStreetMapPlaceGeocoder } from "./PlaceGeocoder";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OpenStreetMapPlaceGeocoder", () => {
  it("장소 이름을 OpenStreetMap 좌표와 표시 주소로 변환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      latitude: 37.5105,
      longitude: 126.995,
      displayName: "반포한강공원, 서초구, 서울특별시, 대한민국"
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new OpenStreetMapPlaceGeocoder().search("  반포한강공원  ");

    expect(result).toEqual({
      latitude: 37.5105,
      longitude: 126.995,
      displayName: "반포한강공원, 서초구, 서울특별시, 대한민국"
    });
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), "https://d-ha.vercel.app");
    expect(requestUrl.pathname).toBe("/api/place-search");
    expect(requestUrl.searchParams.get("q")).toBe("반포한강공원");
  });

  it("검색 결과가 없으면 not-found 오류를 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "PLACE_NOT_FOUND" }), { status: 404 })));

    await expect(new OpenStreetMapPlaceGeocoder().search("없는 장소")).rejects.toMatchObject({ code: "not-found" });
  });

  it("지도 검색 서비스 오류를 사용자 처리 가능한 코드로 변환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 503 })));

    await expect(new OpenStreetMapPlaceGeocoder().search("서울숲")).rejects.toMatchObject({ code: "service-unavailable" });
  });
});
