import { localDateKey } from "./daily";
import type { DailyExercisePlan } from "./types";

export const DEFAULT_EXERCISE_GOAL_METERS = 1_000;
export const MIN_EXERCISE_GOAL_METERS = 100;
export const MAX_EXERCISE_GOAL_METERS = 50_000;

export function createDailyExercisePlan(now = new Date(), goalMeters = DEFAULT_EXERCISE_GOAL_METERS): DailyExercisePlan {
  return { date: localDateKey(now), goalMeters: normalizeExerciseGoal(goalMeters), distanceMeters: 0 };
}

export function refreshDailyExercise(plan: DailyExercisePlan, now = new Date()): DailyExercisePlan {
  const date = localDateKey(now);
  if (plan.date === date) return plan;
  return { date, goalMeters: normalizeExerciseGoal(plan.goalMeters), distanceMeters: 0 };
}

export function setDailyExerciseGoal(plan: DailyExercisePlan, goalMeters: number, now = new Date()): DailyExercisePlan {
  return { ...refreshDailyExercise(plan, now), goalMeters: normalizeExerciseGoal(goalMeters) };
}

export function addDailyExerciseDistance(plan: DailyExercisePlan, distanceMeters: number, now = new Date()): DailyExercisePlan {
  const current = refreshDailyExercise(plan, now);
  const increment = Number.isFinite(distanceMeters) ? Math.max(0, Math.round(distanceMeters)) : 0;
  return { ...current, distanceMeters: Math.min(10_000_000, current.distanceMeters + increment) };
}

export function dailyExerciseProgressPercent(plan: DailyExercisePlan, now = new Date()): number {
  const current = refreshDailyExercise(plan, now);
  return Math.min(100, Math.round((current.distanceMeters / current.goalMeters) * 100));
}

export function normalizeExerciseGoal(goalMeters: number): number {
  const rounded = Number.isFinite(goalMeters) ? Math.round(goalMeters) : DEFAULT_EXERCISE_GOAL_METERS;
  return Math.min(MAX_EXERCISE_GOAL_METERS, Math.max(MIN_EXERCISE_GOAL_METERS, rounded));
}

export function formatExerciseMeters(distanceMeters: number): string {
  return `${Math.max(0, Math.round(distanceMeters)).toLocaleString("ko-KR")}M`;
}
