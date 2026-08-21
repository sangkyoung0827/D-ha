import { describe, expect, it } from "vitest";
import {
  applyElapsedTime,
  calculateCondition,
  clamp,
  NEED_DECAY_PER_HOUR,
  OFFLINE_MAX_HOURS
} from "../domain/balance";
import { unlockAchievements } from "../domain/achievements";
import { createDefaultSave } from "../domain/defaults";
import { refreshDailyGoals } from "../domain/daily";
import {
  calculateMiniGameReward,
  canPurchase,
  grantCoins,
  spendCoins
} from "../domain/economy";
import { levelFromXp } from "../domain/progression";
import { migrateSave, parseImportedSave } from "../store/migrations";
import {
  OCEAN_GAME_BY_ID,
  OCEAN_RUN_CHAPTERS,
  OCEAN_RUN_HIT_GRACE_MS,
  OCEAN_RUN_MAX_HEALTH,
  OCEAN_RUN_OBSTACLE_MAX_SCALE,
  isOceanGame,
  oceanGameNeedEffects,
  oceanRunHealthAfterHit
} from "../domain/ocean";
import { FUR_COLORS, PET_ACCESSORIES, PET_ANIMATIONS, PET_BREEDS, PET_COLLARS, PET_HATS, PET_OUTFITS, PET_PATTERNS } from "../domain/pet";
import { ITEM_BY_ID } from "../domain/catalog";
import { newestAccountSave } from "../store/accountSave";
import { persistenceKeyForOwner } from "../store/persistence";
import { isHomeInterior, topLevelRoom } from "../domain/home";
import { calculateSupplementAssessment } from "../domain/supplementRecommendation";
import { attemptScheduledFeeding, changeFeedingFrequency, createDailyFeedingPlan, feedingProgressPercent, refreshFeedingPlan } from "../domain/feeding";
import { addDailyExerciseDistance, createDailyExercisePlan, dailyExerciseProgressPercent, refreshDailyExercise, setDailyExerciseGoal } from "../domain/exercise";
import {
  appendExplorationTrackPoint,
  distanceBetweenTrackPoints,
  MAX_EXPLORATION_TRACK_POINTS,
  totalExplorationDistanceMeters
} from "../domain/exploration";
import type { ExplorationTrackPoint } from "../domain/types";

const start = new Date("2026-08-01T00:00:00.000Z");

describe("반려동물 상태 계산", () => {
  it("경과 시간만큼 각 상태를 감소시킨다", () => {
    const save = createDefaultSave(start);
    const result = applyElapsedTime(save.needs, start.toISOString(), new Date("2026-08-01T02:00:00.000Z"));

    expect(result.elapsedHours).toBe(2);
    expect(result.needs.satiety).toBeCloseTo(save.needs.satiety - NEED_DECAY_PER_HOUR.satiety * 2);
    expect(result.needs.energy).toBeCloseTo(save.needs.energy - NEED_DECAY_PER_HOUR.energy * 2);
  });

  it("오프라인 경과 시간은 최대 24시간까지만 반영한다", () => {
    const save = createDefaultSave(start);
    const result = applyElapsedTime(save.needs, start.toISOString(), new Date("2026-08-04T00:00:00.000Z"));

    expect(result.elapsedHours).toBe(OFFLINE_MAX_HOURS);
    expect(result.needs.hygiene).toBeCloseTo(save.needs.hygiene - NEED_DECAY_PER_HOUR.hygiene * OFFLINE_MAX_HOURS);
  });

  it("상태 값을 0에서 100 사이로 clamp한다", () => {
    expect(clamp(-20)).toBe(0);
    expect(clamp(130)).toBe(100);
    expect(clamp(Number.NaN)).toBe(0);
  });

  it("네 상태의 가중 평균과 최근 돌봄 보너스로 컨디션을 계산한다", () => {
    const needs = { satiety: 80, hygiene: 60, energy: 40, joy: 20 };
    expect(calculateCondition(needs, null, start)).toBe(51);
    expect(calculateCondition(needs, start.toISOString(), start)).toBe(55);
  });
});

describe("경제와 성장", () => {
  it("코인은 음수가 되지 않도록 지급한다", () => {
    expect(grantCoins(80, 25)).toBe(105);
    expect(grantCoins(20, -500)).toBe(20);
  });

  it("가격과 레벨을 모두 충족한 구매만 허용한다", () => {
    expect(canPurchase(200, 120, 3, 2)).toBe(true);
    expect(canPurchase(100, 120, 3, 2)).toBe(false);
    expect(canPurchase(200, 120, 1, 2)).toBe(false);
    expect(spendCoins(200, 120)).toBe(80);
    expect(() => spendCoins(50, 120)).toThrow("코인이 부족합니다.");
  });

  it("누적 XP의 레벨 구간을 계산한다", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(79)).toBe(1);
    expect(levelFromXp(80)).toBe(2);
    expect(levelFromXp(540)).toBe(5);
  });

  it("미니게임 보상은 비정상 고득점에도 상한을 지킨다", () => {
    const reward = calculateMiniGameReward({
      gameId: "bubble-focus",
      score: 999_999,
      success: true,
      durationMs: 30_000
    });

    expect(reward).toEqual({ coins: 180, xp: 90 });
  });
});

describe("바다 생태계 진행", () => {
  it("Ocean Run은 작은 장애물과 네 번의 충돌 여유를 제공한다", () => {
    expect(OCEAN_RUN_OBSTACLE_MAX_SCALE).toBeLessThan(1);
    expect(OCEAN_RUN_MAX_HEALTH).toBe(4);
    expect(OCEAN_RUN_HIT_GRACE_MS).toBeGreaterThanOrEqual(1_500);
    expect(oceanRunHealthAfterHit(OCEAN_RUN_MAX_HEALTH)).toBe(3);
    expect(oceanRunHealthAfterHit(1)).toBe(0);
    expect(oceanRunHealthAfterHit(0)).toBe(0);
  });

  it("Ocean 게임 선택은 Ocean Run과 Jump Up 두 개만 제공한다", () => {
    expect(Array.from(OCEAN_GAME_BY_ID.keys())).toEqual(["ocean-run", "jump-up"]);
    expect(OCEAN_RUN_CHAPTERS.map((chapter) => chapter.id)).toEqual(["beach", "surf", "cave", "deepsea"]);
    expect(isOceanGame("ocean-run")).toBe(true);
    expect(isOceanGame("jump-up")).toBe(true);
    expect(isOceanGame("beach-volleyball")).toBe(false);
  });

  it("산소통과 잠수함은 계정 인벤토리 소유 여부로 각 챕터를 연다", () => {
    const result = { gameId: "ocean-run" as const, score: 500, success: true, durationMs: 48_000 };
    expect(isOceanGame(result.gameId)).toBe(true);
    expect(oceanGameNeedEffects(result)).toEqual({ joy: 16, energy: -7 });
  });
});

describe("집과 야외 공간 구성", () => {
  it("거실·주방·욕실·침실·옷장은 Home으로 묶고 Ocean과 Workout만 야외로 둔다", () => {
    expect(["studio", "kitchen", "bathroom", "bedroom", "wardrobe"].every((room) => isHomeInterior(room as Parameters<typeof isHomeInterior>[0]))).toBe(true);
    expect(isHomeInterior("wellness")).toBe(false);
    expect(isHomeInterior("game-room")).toBe(false);
    expect(topLevelRoom("kitchen")).toBe("studio");
    expect(topLevelRoom("bedroom")).toBe("studio");
    expect(topLevelRoom("wellness")).toBe("wellness");
    expect(topLevelRoom("game-room")).toBe("game-room");
  });
});

describe("진행 데이터", () => {
  it("강아지·고양이 10종과 세분화된 반려동물 외형을 제공한다", () => {
    const save = createDefaultSave(start);

    expect(PET_BREEDS).toHaveLength(10);
    expect(PET_BREEDS.filter((breed) => breed.species === "dog")).toHaveLength(5);
    expect(PET_BREEDS.filter((breed) => breed.species === "cat")).toHaveLength(5);
    expect(FUR_COLORS.length).toBeGreaterThanOrEqual(8);
    expect(PET_PATTERNS).toHaveLength(5);
    expect(PET_COLLARS).toHaveLength(5);
    expect(PET_HATS).toHaveLength(4);
    expect(PET_ACCESSORIES).toHaveLength(5);
    expect(PET_OUTFITS).toHaveLength(5);
    expect(PET_ANIMATIONS).toEqual(["idle", "walk", "run", "eat", "sleep", "wash", "happy", "tired", "jump"]);
    expect(save.profile.breed).toBe("maltese");
    expect(save.profile.accessory).toBe("none");
    expect(ITEM_BY_ID[save.equipped.top!]?.name).toBe("화이트 반팔 티셔츠");
  });

  it("이미 열린 업적 보상을 중복 지급하지 않는다", () => {
    const base = createDefaultSave(start);
    const eligible = {
      ...base,
      needs: { ...base.needs, satiety: 30, hygiene: 30, energy: 30, joy: 30, condition: 30 },
      stats: { ...base.stats, meals: 1 }
    };
    const once = unlockAchievements(eligible, start);
    const twice = unlockAchievements(once, new Date("2026-08-01T00:01:00.000Z"));

    expect(once.achievements.filter((item) => item.id === "first-meal")).toHaveLength(1);
    expect(twice.coins).toBe(once.coins);
    expect(twice.xp).toBe(once.xp);
  });

  it("로컬 날짜가 바뀌면 일일 목표를 초기화한다", () => {
    const oldGoals = createDefaultSave(start).dailyGoals.map((goal) => ({ ...goal, progress: goal.target, completed: true }));
    const refreshed = refreshDailyGoals("2026-08-01", oldGoals, new Date("2026-08-02T08:00:00.000Z"));

    expect(refreshed.date).toBe("2026-08-02");
    expect(refreshed.goals.every((goal) => goal.progress === 0 && !goal.completed)).toBe(true);
  });

  it("기존 사람 외형 저장을 진행 상태를 보존한 반려동물 v9 저장으로 마이그레이션한다", () => {
    const current = createDefaultSave(start);
    const legacyProfile = {
      name: current.profile.name,
      skinTone: "sand",
      hairStyle: "wave",
      hairColor: "midnight",
      glassesStyle: "round"
    };
    const legacy = { ...current, version: 4, profile: legacyProfile, coins: 777 };
    const result = migrateSave(legacy, start);

    expect(result.status).toBe("migrated");
    expect(result.save.version).toBe(9);
    expect(result.save.profile.name).toBe(current.profile.name);
    expect(result.save.profile.breed).toBe("maltese");
    expect(result.save.coins).toBe(777);
    expect(result.save.petMedical.records).toEqual([]);
    expect(result.save.petMemories).toEqual([]);
    expect(result.save.petExplorations).toEqual([]);
  });

  it("반려동물 v5 저장은 선택한 품종과 외형을 유지하며 건강·추억·탐험 저장을 추가한다", () => {
    const current = createDefaultSave(start);
    const previous = {
      ...current,
      version: 5,
      profile: { ...current.profile, species: "cat", breed: "siamese", furColor: "seal", pattern: "points" }
    } as Record<string, unknown>;
    delete previous.petMedical;
    delete previous.petMemories;
    delete previous.petExplorations;
    const result = migrateSave(previous, start);

    expect(result.status).toBe("migrated");
    expect(result.save.profile.breed).toBe("siamese");
    expect(result.save.profile.pattern).toBe("points");
    expect(result.save.petMedical.bloodType).toBe("미확인");
    expect(result.save.petMemories).toEqual([]);
    expect(result.save.petExplorations).toEqual([]);
  });

  it("v6의 단일 탐험 장소를 빈 경로가 있는 v9 기록으로 안전하게 옮긴다", () => {
    const current = createDefaultSave(start);
    const previous = {
      ...current,
      version: 6,
      petExplorations: [{
        id: "place-old",
        placeName: "한강공원",
        visitDate: "2026-08-01",
        note: "산책",
        latitude: 37.51,
        longitude: 126.99,
        createdAt: start.toISOString()
      }]
    };
    const result = migrateSave(previous, start);

    expect(result.status).toBe("migrated");
    expect(result.save.version).toBe(9);
    expect(result.save.petExplorations[0]).toMatchObject({ route: [], distanceMeters: 0, durationSeconds: 0 });
  });

  it("손상 저장 데이터는 백업과 안전한 새 저장을 제공한다", () => {
    const malformed = parseImportedSave("{not-json");
    const invalid = migrateSave({ version: 5, coins: -10 }, start);

    expect(malformed.status).toBe("corrupt");
    expect(malformed.backup).toBe("{not-json");
    expect(invalid.status).toBe("corrupt");
    expect(invalid.save.version).toBe(9);
    expect(invalid.save.coins).toBeGreaterThanOrEqual(0);
  });
});

describe("일일 급양", () => {
  const morning = new Date(2026, 7, 22, 8, 0, 0);
  const evening = new Date(2026, 7, 22, 18, 0, 0);

  it("기본 아침·저녁 두 끼를 각각 50으로 기록하고 같은 식사는 중복 처리하지 않는다", () => {
    const plan = createDailyFeedingPlan(morning);
    const breakfast = attemptScheduledFeeding(plan, morning);
    const duplicateBreakfast = attemptScheduledFeeding(breakfast.plan, new Date(2026, 7, 22, 9, 30, 0));
    const dinner = attemptScheduledFeeding(breakfast.plan, evening);
    const afterComplete = attemptScheduledFeeding(dinner.plan, new Date(2026, 7, 22, 20, 0, 0));

    expect(breakfast).toMatchObject({ status: "completed", slotLabel: "아침", increment: 50, progressAfter: 50 });
    expect(duplicateBreakfast).toMatchObject({ status: "duplicate", increment: 0, progressAfter: 50 });
    expect(dinner).toMatchObject({ status: "completed", slotLabel: "저녁", increment: 50, progressAfter: 100 });
    expect(afterComplete.status).toBe("all-complete");
  });

  it("보호자가 급양 횟수를 바꿔도 오늘 완료 횟수를 보존하고 다음 날에는 게이지를 초기화한다", () => {
    const breakfast = attemptScheduledFeeding(createDailyFeedingPlan(morning), morning);
    const threeMeals = changeFeedingFrequency(breakfast.plan, 3, morning);
    const nextDay = refreshFeedingPlan(threeMeals, new Date(2026, 7, 23, 8, 0, 0));

    expect(threeMeals.dailyTarget).toBe(3);
    expect(threeMeals.completedSlots).toEqual(["morning"]);
    expect(feedingProgressPercent(threeMeals, morning)).toBe(33);
    expect(nextDay.completedSlots).toEqual([]);
    expect(feedingProgressPercent(nextDay, new Date(2026, 7, 23, 8, 0, 0))).toBe(0);
  });

  it("v7 저장에 기본 하루 2회 급양 계획을 추가해 마이그레이션한다", () => {
    const current = createDefaultSave(morning);
    const previous = { ...current, version: 7 } as Record<string, unknown>;
    delete previous.feedingPlan;

    const result = migrateSave(previous, morning);

    expect(result.status).toBe("migrated");
    expect(result.save.version).toBe(9);
    expect(result.save.feedingPlan).toEqual({ date: "2026-08-22", dailyTarget: 2, completedSlots: [] });
  });
});

describe("오늘의 운동", () => {
  const morning = new Date(2026, 7, 22, 8, 0, 0);

  it("GPS 이동 거리를 미터 단위로 누적하고 목표 대비 게이지를 계산한다", () => {
    const plan = createDailyExercisePlan(morning, 1_000);
    const moved = addDailyExerciseDistance(plan, 275.4, morning);
    const customGoal = setDailyExerciseGoal(moved, 500, morning);

    expect(moved.distanceMeters).toBe(275);
    expect(dailyExerciseProgressPercent(moved, morning)).toBe(28);
    expect(customGoal.goalMeters).toBe(500);
    expect(customGoal.distanceMeters).toBe(275);
    expect(dailyExerciseProgressPercent(customGoal, morning)).toBe(55);
  });

  it("날짜가 바뀌면 이동량만 초기화하고 보호자가 정한 목표는 유지한다", () => {
    const moved = addDailyExerciseDistance(createDailyExercisePlan(morning, 2_000), 840, morning);
    const nextDay = refreshDailyExercise(moved, new Date(2026, 7, 23, 8, 0, 0));

    expect(nextDay).toEqual({ date: "2026-08-23", goalMeters: 2_000, distanceMeters: 0 });
  });

  it("v8 저장에 기본 운동 목표를 추가하면서 급양 기록은 유지한다", () => {
    const current = createDefaultSave(morning);
    const previous = { ...current, version: 8, feedingPlan: { ...current.feedingPlan, completedSlots: ["morning"] } } as Record<string, unknown>;
    delete previous.dailyExercise;

    const result = migrateSave(previous, morning);

    expect(result.status).toBe("migrated");
    expect(result.save.version).toBe(9);
    expect(result.save.feedingPlan.completedSlots).toEqual(["morning"]);
    expect(result.save.dailyExercise).toEqual({ date: "2026-08-22", goalMeters: 1_000, distanceMeters: 0 });
  });
});

describe("펫 탐험 경로", () => {
  const point = (latitude: number, longitude: number, seconds: number, accuracy = 8): ExplorationTrackPoint => ({
    latitude,
    longitude,
    accuracy,
    capturedAt: new Date(start.getTime() + seconds * 1_000).toISOString()
  });

  it("GPS 좌표 간 실제 이동 거리와 누적 거리를 계산한다", () => {
    const route = [point(37.5, 127, 0), point(37.501, 127, 60), point(37.502, 127, 120)];

    expect(distanceBetweenTrackPoints(route[0]!, route[1]!)).toBeGreaterThan(110);
    expect(distanceBetweenTrackPoints(route[0]!, route[1]!)).toBeLessThan(112);
    expect(totalExplorationDistanceMeters(route)).toBeGreaterThan(220);
  });

  it("정확도가 낮거나 비정상적으로 빠른 GPS 점프는 경로에서 제외한다", () => {
    const first = point(37.5, 127, 0);
    const poorAccuracy = point(37.501, 127, 60, 200);
    const impossibleJump = point(37.6, 127, 61);
    const route = appendExplorationTrackPoint([], first);

    expect(appendExplorationTrackPoint(route, poorAccuracy)).toBe(route);
    expect(appendExplorationTrackPoint(route, impossibleJump)).toBe(route);
  });

  it("긴 탐험은 오래된 점을 축약해 저장 크기 상한을 지킨다", () => {
    let route: ExplorationTrackPoint[] = [];
    for (let index = 0; index < MAX_EXPLORATION_TRACK_POINTS + 20; index += 1) {
      route = appendExplorationTrackPoint(route, point(37.5 + index * 0.00003, 127, index * 5));
    }

    expect(route.length).toBeLessThanOrEqual(MAX_EXPLORATION_TRACK_POINTS);
    expect(route[0]?.latitude).toBe(37.5);
    expect(route.at(-1)?.latitude).toBeCloseTo(37.5 + (MAX_EXPLORATION_TRACK_POINTS + 19) * 0.00003);
  });
});

describe("계정별 저장", () => {
  it("Google UID마다 독립적인 로컬 저장 키를 사용한다", () => {
    expect(persistenceKeyForOwner(null)).toBe("primary");
    expect(persistenceKeyForOwner("google-user-a")).toBe("user:google-user-a");
    expect(persistenceKeyForOwner("google-user-b")).toBe("user:google-user-b");
    expect(persistenceKeyForOwner("google-user-a")).not.toBe(persistenceKeyForOwner("google-user-b"));
  });

  it("같은 계정에서는 가장 최근의 유효한 로컬·클라우드 저장을 선택한다", () => {
    const local = createDefaultSave(start);
    const cloud = { ...local, coins: 940, lastSavedAt: "2026-08-01T03:00:00.000Z" };
    const selected = newestAccountSave(
      { status: "valid", save: local },
      { status: "valid", save: cloud }
    );

    expect(selected?.save.coins).toBe(940);
  });
});

describe("반려동물 영양제 스크리닝", () => {
  it("성장기에는 실제 섭취 열량과 FEDIAF EPA+DHA 기준으로 보완 참고값을 계산한다", () => {
    const result = calculateSupplementAssessment({
      species: "dog",
      weightKg: 5,
      lifeStage: "growth",
      activity: "normal",
      bodyCondition: 5,
      goal: "daily",
      dailyCalories: 500,
      currentEpaDhaMg: 20,
      productEpaMg: 20,
      productDhaMg: 25,
      labelMaxServings: 1,
      risks: []
    });

    expect(result.status).toBe("planning-reference");
    expect(result.referenceEpaDhaMg).toBe(65);
    expect(result.calculatedGapMg).toBe(45);
    expect(result.calculatedServings).toBe(1);
    expect(result.requiresVeterinarian).toBe(false);
  });

  it("성체는 근거가 부족한 정량을 만들지 않고 위험요인이 있으면 수의사 검토로 전환한다", () => {
    const result = calculateSupplementAssessment({
      species: "cat",
      weightKg: 4.2,
      lifeStage: "adult",
      activity: "low",
      bodyCondition: 6,
      goal: "cognition",
      currentEpaDhaMg: 40,
      productEpaMg: 30,
      productDhaMg: 20,
      labelMaxServings: 1,
      risks: ["medication"]
    });

    expect(result.status).toBe("review-required");
    expect(result.referenceEpaDhaMg).toBeNull();
    expect(result.calculatedGapMg).toBeNull();
    expect(result.calculatedServings).toBeNull();
    expect(result.requiresVeterinarian).toBe(true);
  });
});
