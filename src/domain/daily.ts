import type { DailyGoal, NeedValues } from "./types";

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDailyGoals(): DailyGoal[] {
  return [
    { id: "feed", label: "디하에게 음식 한 번 주기", progress: 0, target: 1, completed: false },
    { id: "wash", label: "청결 관리 한 번 하기", progress: 0, target: 1, completed: false },
    { id: "play", label: "미니게임 한 번 하기", progress: 0, target: 1, completed: false },
    { id: "balanced", label: "상태 세 개를 70 이상 만들기", progress: 0, target: 3, completed: false }
  ];
}

export function refreshDailyGoals(
  date: string,
  goals: DailyGoal[],
  now = new Date()
): { date: string; goals: DailyGoal[] } {
  const today = localDateKey(now);
  return date === today ? { date, goals } : { date: today, goals: createDailyGoals() };
}

export function progressDailyGoal(goals: DailyGoal[], id: DailyGoal["id"], amount = 1): DailyGoal[] {
  return goals.map((goal) => {
    if (goal.id !== id || goal.completed) return goal;
    const progress = Math.min(goal.target, goal.progress + amount);
    return { ...goal, progress, completed: progress >= goal.target };
  });
}

export function updateBalancedGoal(goals: DailyGoal[], needs: NeedValues): DailyGoal[] {
  const count = [needs.satiety, needs.hygiene, needs.energy, needs.joy].filter((value) => value >= 70).length;
  return goals.map((goal) =>
    goal.id === "balanced"
      ? { ...goal, progress: Math.min(goal.target, count), completed: count >= goal.target }
      : goal
  );
}
