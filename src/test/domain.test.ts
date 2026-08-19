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
import { OCEAN_GAME_BY_ID, OCEAN_RUN_CHAPTERS, isOceanGame, oceanGameNeedEffects, ownsOceanGear } from "../domain/ocean";
import { FUR_COLORS, PET_ACCESSORIES, PET_ANIMATIONS, PET_BREEDS, PET_COLLARS, PET_HATS, PET_OUTFITS, PET_PATTERNS } from "../domain/pet";
import { ITEM_BY_ID } from "../domain/catalog";
import { newestAccountSave } from "../store/accountSave";
import { persistenceKeyForOwner } from "../store/persistence";
import { isHomeInterior, topLevelRoom } from "../domain/home";

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
  it("Ocean 게임 선택은 Ocean Run과 Jump Up 두 개만 제공한다", () => {
    expect(Array.from(OCEAN_GAME_BY_ID.keys())).toEqual(["ocean-run", "jump-up"]);
    expect(OCEAN_RUN_CHAPTERS.map((chapter) => chapter.id)).toEqual(["beach", "surf", "cave", "deepsea"]);
    expect(isOceanGame("ocean-run")).toBe(true);
    expect(isOceanGame("jump-up")).toBe(true);
    expect(isOceanGame("beach-volleyball")).toBe(false);
  });

  it("산소통과 잠수함은 계정 인벤토리 소유 여부로 각 챕터를 연다", () => {
    expect(ownsOceanGear({})).toEqual({ oxygenTank: false, submarine: false });
    expect(ownsOceanGear({ "ocean-oxygen-tank": 1, "ocean-submarine": 1 })).toEqual({ oxygenTank: true, submarine: true });
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

  it("기존 사람 외형 저장을 진행 상태를 보존한 반려동물 v5 저장으로 마이그레이션한다", () => {
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
    expect(result.save.version).toBe(5);
    expect(result.save.profile.name).toBe(current.profile.name);
    expect(result.save.profile.breed).toBe("maltese");
    expect(result.save.coins).toBe(777);
  });

  it("손상 저장 데이터는 백업과 안전한 새 저장을 제공한다", () => {
    const malformed = parseImportedSave("{not-json");
    const invalid = migrateSave({ version: 5, coins: -10 }, start);

    expect(malformed.status).toBe("corrupt");
    expect(malformed.backup).toBe("{not-json");
    expect(invalid.status).toBe("corrupt");
    expect(invalid.save.version).toBe(5);
    expect(invalid.save.coins).toBeGreaterThanOrEqual(0);
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
