import { describe, expect, it } from "vitest";
import { cleanResearchAnswer } from "./plainText";

describe("헤더 펫 연구원 답변 표시", () => {
  it("마크다운 특수문자는 없애고 문장과 근거 번호는 유지한다", () => {
    expect(cleanResearchAnswer("## **식단 확인**\n- `사료 라벨`을 먼저 살펴봐요 [1]."))
      .toBe("식단 확인\n사료 라벨을 먼저 살펴봐요 [1].");
  });

  it("마크다운 링크는 주소 대신 읽기 쉬운 제목만 남긴다", () => {
    expect(cleanResearchAnswer("[WSAVA 자료](https://wsava.org/example)를 참고해요."))
      .toBe("WSAVA 자료를 참고해요.");
  });
});
