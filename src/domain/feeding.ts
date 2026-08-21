import { localDateKey } from "./daily";
import type { DailyFeedingPlan, FeedingFrequency, FeedingSlotId } from "./types";

export interface FeedingAttempt {
  status: "completed" | "duplicate" | "all-complete";
  plan: DailyFeedingPlan;
  slot: FeedingSlotId;
  slotLabel: string;
  progressBefore: number;
  progressAfter: number;
  increment: number;
}

const SLOTS_BY_FREQUENCY: Record<FeedingFrequency, readonly FeedingSlotId[]> = {
  1: ["daily"],
  2: ["morning", "evening"],
  3: ["morning", "midday", "evening"],
  4: ["morning", "midday", "evening", "night"]
};

const SLOT_LABELS: Record<FeedingSlotId, string> = {
  daily: "오늘",
  morning: "아침",
  midday: "점심",
  evening: "저녁",
  night: "밤"
};

export function createDailyFeedingPlan(now = new Date(), dailyTarget: FeedingFrequency = 2): DailyFeedingPlan {
  return { date: localDateKey(now), dailyTarget, completedSlots: [] };
}

export function refreshFeedingPlan(plan: DailyFeedingPlan, now = new Date()): DailyFeedingPlan {
  const date = localDateKey(now);
  if (plan.date === date) return plan;
  return { date, dailyTarget: plan.dailyTarget, completedSlots: [] };
}

export function feedingProgressPercent(plan: DailyFeedingPlan, now = new Date()): number {
  const current = refreshFeedingPlan(plan, now);
  return Math.min(100, Math.round((current.completedSlots.length / current.dailyTarget) * 100));
}

export function feedingSlots(dailyTarget: FeedingFrequency): readonly FeedingSlotId[] {
  return SLOTS_BY_FREQUENCY[dailyTarget];
}

export function feedingSlotLabel(slot: FeedingSlotId): string {
  return SLOT_LABELS[slot];
}

export function currentFeedingSlot(dailyTarget: FeedingFrequency, now = new Date()): FeedingSlotId {
  const hour = now.getHours();
  if (dailyTarget === 1) return "daily";
  if (dailyTarget === 2) return hour < 15 ? "morning" : "evening";
  if (dailyTarget === 3) return hour < 11 ? "morning" : hour < 17 ? "midday" : "evening";
  return hour < 8 ? "morning" : hour < 13 ? "midday" : hour < 19 ? "evening" : "night";
}

export function attemptScheduledFeeding(plan: DailyFeedingPlan, now = new Date()): FeedingAttempt {
  const current = refreshFeedingPlan(plan, now);
  const slot = currentFeedingSlot(current.dailyTarget, now);
  const progressBefore = feedingProgressPercent(current, now);
  if (current.completedSlots.length >= current.dailyTarget) {
    return { status: "all-complete", plan: current, slot, slotLabel: feedingSlotLabel(slot), progressBefore, progressAfter: progressBefore, increment: 0 };
  }
  if (current.completedSlots.includes(slot)) {
    return { status: "duplicate", plan: current, slot, slotLabel: feedingSlotLabel(slot), progressBefore, progressAfter: progressBefore, increment: 0 };
  }
  const next = { ...current, completedSlots: [...current.completedSlots, slot] };
  const progressAfter = feedingProgressPercent(next, now);
  return {
    status: "completed",
    plan: next,
    slot,
    slotLabel: feedingSlotLabel(slot),
    progressBefore,
    progressAfter,
    increment: progressAfter - progressBefore
  };
}

export function changeFeedingFrequency(plan: DailyFeedingPlan, dailyTarget: FeedingFrequency, now = new Date()): DailyFeedingPlan {
  const current = refreshFeedingPlan(plan, now);
  const slots = feedingSlots(dailyTarget);
  return {
    date: current.date,
    dailyTarget,
    completedSlots: slots.slice(0, Math.min(current.completedSlots.length, dailyTarget))
  };
}
