import { describe, expect, it } from "vitest";
import { createDefaultSave } from "../domain/defaults";
import {
  buildPetResearchAccountSummary,
  decodeFirestoreDocumentOwner,
  decodeFirestoreDocumentSave,
  isAccountRecordQuestion,
  requiresAcademicEvidence
} from "../../server/petResearchContext";

const now = new Date("2026-08-22T03:00:00.000Z");

describe("헤더 펫 연구원 계정 컨텍스트", () => {
  it("일기·탐험·진료·게임 기록은 포함하고 민감 원본 데이터는 제외한다", () => {
    const base = createDefaultSave(now, { ...createDefaultSave(now).profile, name: "복돌이" });
    const save = {
      ...base,
      petMedical: {
        bloodType: "DEA 1.1 음성",
        microchipId: "SECRET-MICROCHIP-410",
        hospital: { hospitalName: "복돌동물병원", patientNumber: "SECRET-PATIENT-9", status: "connected" as const, lastSyncedAt: now.toISOString() },
        records: [{ id: "record-1", visitDate: "2026-08-10", hospitalName: "복돌동물병원", diagnosis: "정기검진", treatment: "기본 검진", note: "특이사항 없음", nextVisitDate: null, source: "manual" as const, createdAt: now.toISOString() }]
      },
      petMemories: [{ id: "memory-1", title: "제주 가족여행", memoryDate: "2026-07-01", note: "제주도 해변에서 가족들과 놀았어요.", photoDataUrl: "data:image/jpeg;base64,SECRET-PHOTO", createdAt: now.toISOString() }],
      petExplorations: [{
        id: "place-1",
        placeName: "속초 영랑호",
        visitDate: "2026-07-20",
        note: "강릉을 거쳐 가족과 산책",
        latitude: 38.207,
        longitude: 128.5918,
        route: [{ latitude: 38.207, longitude: 128.5918, accuracy: 4, capturedAt: now.toISOString() }],
        distanceMeters: 1840,
        durationSeconds: 2400,
        createdAt: now.toISOString()
      }]
    };

    const summary = buildPetResearchAccountSummary(save);
    const serialized = JSON.stringify(summary);

    expect(summary.scope).toBe("current-authenticated-account");
    expect(summary.pet.name).toBe("복돌이");
    expect(summary.diary[0]).toMatchObject({ title: "제주 가족여행", hasPhoto: true });
    expect(summary.explorations[0]).toMatchObject({ placeName: "속초 영랑호", distanceMeters: 1840, hasRecordedRoute: true });
    expect(summary.medical.records[0]?.diagnosis).toBe("정기검진");
    expect(serialized).not.toContain("SECRET-MICROCHIP-410");
    expect(serialized).not.toContain("SECRET-PATIENT-9");
    expect(serialized).not.toContain("SECRET-PHOTO");
    expect(serialized).not.toContain("38.207");
    expect(serialized).not.toContain("128.5918");
    expect(serialized).not.toContain("capturedAt");
  });

  it("Firestore REST 형식에서 소유자와 저장 데이터만 복원한다", () => {
    const document = {
      fields: {
        ownerId: { stringValue: "google-user-a" },
        schemaVersion: { integerValue: "7" },
        save: { mapValue: { fields: {
          version: { integerValue: "7" },
          tutorialComplete: { booleanValue: true },
          tags: { arrayValue: { values: [{ stringValue: "서울" }, { stringValue: "제주" }] } }
        } } }
      }
    };

    expect(decodeFirestoreDocumentOwner(document)).toBe("google-user-a");
    expect(decodeFirestoreDocumentSave(document)).toEqual({ version: 7, tutorialComplete: true, tags: ["서울", "제주"] });
  });

  it("개인 기록 질문과 연구 근거가 필요한 건강 질문을 구분한다", () => {
    expect(isAccountRecordQuestion("복돌이는 어디를 가봤어?")).toBe(true);
    expect(isAccountRecordQuestion("우리 아이 진료 기록을 알려줘")).toBe(true);
    expect(requiresAcademicEvidence("복돌이 탐험 장소를 알려줘")).toBe(false);
    expect(requiresAcademicEvidence("복돌이의 관절 건강에 DHA가 도움이 돼?")).toBe(true);
  });
});
