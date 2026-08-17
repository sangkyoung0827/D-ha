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

const start = new Date("2026-08-01T00:00:00.000Z");

describe("Keeper 상태 계산", () => {
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

describe("진행 데이터", () => {
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

  it("v1 저장 데이터를 현재 v3 스키마로 마이그레이션한다", () => {
    const legacy = { ...createDefaultSave(start), version: 1, coins: 777 };
    const result = migrateSave(legacy, start);

    expect(result.status).toBe("migrated");
    expect(result.save.version).toBe(3);
    expect(result.save.coins).toBe(777);
  });

  it("손상 저장 데이터는 백업과 안전한 새 저장을 제공한다", () => {
    const malformed = parseImportedSave("{not-json");
    const invalid = migrateSave({ version: 3, coins: -10 }, start);

    expect(malformed.status).toBe("corrupt");
    expect(malformed.backup).toBe("{not-json");
    expect(invalid.status).toBe("corrupt");
    expect(invalid.save.version).toBe(3);
    expect(invalid.save.coins).toBeGreaterThanOrEqual(0);
  });
});
