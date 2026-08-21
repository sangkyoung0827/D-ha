import { afterEach, describe, expect, it, vi } from "vitest";
import { WebLocationProvider } from "./LocationProvider";

const originalGeolocation = navigator.geolocation;

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: originalGeolocation });
  vi.restoreAllMocks();
});

describe("WebLocationProvider", () => {
  it("watchPosition의 실시간 좌표를 표준 경로 점으로 전달하고 구독을 해제한다", () => {
    const clearWatch = vi.fn();
    const watchPosition = vi.fn((success: PositionCallback, _error: PositionErrorCallback | null, _options?: PositionOptions) => {
      void _error;
      void _options;
      success({
        coords: { latitude: 37.51, longitude: 126.99, accuracy: 9 },
        timestamp: Date.parse("2026-08-22T01:00:00.000Z")
      } as GeolocationPosition);
      return 27;
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch, getCurrentPosition: vi.fn() }
    });
    const onPosition = vi.fn();
    const provider = new WebLocationProvider();

    const stop = provider.watch(onPosition, vi.fn());
    stop();

    expect(onPosition).toHaveBeenCalledWith({
      latitude: 37.51,
      longitude: 126.99,
      accuracy: 9,
      capturedAt: "2026-08-22T01:00:00.000Z"
    });
    expect(watchPosition.mock.calls[0]?.[2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 3_000 });
    expect(clearWatch).toHaveBeenCalledWith(27);
  });

  it("브라우저 위치 오류를 사용자 처리 가능한 코드로 변환한다", () => {
    const watchPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1 } as GeolocationPositionError);
      return 3;
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch: vi.fn(), getCurrentPosition: vi.fn() }
    });
    const onError = vi.fn();

    new WebLocationProvider().watch(vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith("permission-denied");
  });
});
