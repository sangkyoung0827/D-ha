import { describe, expect, it } from "vitest";
import { isIosDevice, isStandaloneDisplay } from "./install";

describe("PWA 설치 환경 판별", () => {
  it("iPhone과 터치 기반 iPad 데스크톱 UA를 판별한다", () => {
    expect(isIosDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" })).toBe(true);
    expect(isIosDevice({ userAgent: "Mozilla/5.0", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: "Mozilla/5.0 (Linux; Android 15)", platform: "Linux armv8l" })).toBe(false);
  });

  it("display-mode 또는 iOS standalone 중 하나면 설치 상태로 본다", () => {
    expect(isStandaloneDisplay(() => ({ matches: true }), false)).toBe(true);
    expect(isStandaloneDisplay(() => ({ matches: false }), true)).toBe(true);
    expect(isStandaloneDisplay(() => ({ matches: false }), false)).toBe(false);
  });
});
