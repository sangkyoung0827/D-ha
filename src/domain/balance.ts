import type { NeedValues } from "./types";

export const OFFLINE_MAX_HOURS = 24;
export const NEED_DECAY_PER_HOUR = {
  satiety: 2.4,
  hygiene: 1.25,
  energy: 1.8,
  joy: 1.05
} as const;

export const CARE_XP_COOLDOWN_MS = 15_000;
export const CARE_RECENT_BONUS_HOURS = 4;

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function calculateCondition(
  needs: Omit<NeedValues, "condition">,
  lastCareAt: string | null,
  now = new Date()
): number {
  const weighted =
    needs.satiety * 0.28 + needs.hygiene * 0.2 + needs.energy * 0.3 + needs.joy * 0.22;
  const lastCare = lastCareAt ? new Date(lastCareAt).getTime() : 0;
  const recentBonus = now.getTime() - lastCare <= CARE_RECENT_BONUS_HOURS * 3_600_000 ? 4 : 0;
  return Math.round(clamp(weighted + recentBonus));
}

export function applyNeedEffects(
  current: NeedValues,
  effects: Partial<Omit<NeedValues, "condition">>,
  lastCareAt: string | null,
  now = new Date()
): NeedValues {
  const base = {
    satiety: clamp(current.satiety + (effects.satiety ?? 0)),
    hygiene: clamp(current.hygiene + (effects.hygiene ?? 0)),
    energy: clamp(current.energy + (effects.energy ?? 0)),
    joy: clamp(current.joy + (effects.joy ?? 0))
  };
  return { ...base, condition: calculateCondition(base, lastCareAt, now) };
}

export function applyElapsedTime(
  current: NeedValues,
  lastSavedAt: string,
  now = new Date(),
  maxHours = OFFLINE_MAX_HOURS
): { needs: NeedValues; elapsedHours: number } {
  const elapsedMs = Math.max(0, now.getTime() - new Date(lastSavedAt).getTime());
  const elapsedHours = Math.min(maxHours, elapsedMs / 3_600_000);
  const base = {
    satiety: clamp(current.satiety - NEED_DECAY_PER_HOUR.satiety * elapsedHours),
    hygiene: clamp(current.hygiene - NEED_DECAY_PER_HOUR.hygiene * elapsedHours),
    energy: clamp(current.energy - NEED_DECAY_PER_HOUR.energy * elapsedHours),
    joy: clamp(current.joy - NEED_DECAY_PER_HOUR.joy * elapsedHours)
  };
  return {
    needs: { ...base, condition: calculateCondition(base, null, now) },
    elapsedHours
  };
}

export function needState(value: number): "활기참" | "보통" | "돌봄 필요" {
  if (value >= 70) return "활기참";
  if (value >= 40) return "보통";
  return "돌봄 필요";
}
