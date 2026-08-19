import { describe, expect, it, vi } from "vitest";
import { canonicalUrlFor, redirectToCanonicalHost } from "./canonicalHost";

describe("공식 앱 주소 통합", () => {
  it("Vercel 임시 주소의 경로와 쿼리를 보존해 공식 주소로 바꾼다", () => {
    expect(canonicalUrlFor(new URL("https://d-build-example.vercel.app/ocean?debug=1#games")))
      .toBe("https://d-ha.vercel.app/ocean?debug=1#games");
  });

  it("공식 주소와 로컬 개발 주소는 이동시키지 않는다", () => {
    expect(canonicalUrlFor(new URL("https://d-ha.vercel.app/"))).toBeNull();
    expect(canonicalUrlFor(new URL("http://127.0.0.1:5173/"))).toBeNull();
  });

  it("임시 주소에서는 앱을 렌더링하기 전에 location.replace를 호출한다", () => {
    const replace = vi.fn();

    expect(redirectToCanonicalHost({
      href: "https://d-preview-team.vercel.app/?from=login",
      replace
    })).toBe(true);
    expect(replace).toHaveBeenCalledWith("https://d-ha.vercel.app/?from=login");
  });
});
