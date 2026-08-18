import type { GameSave } from "./types";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  coins: number;
  xp: number;
  check(save: GameSave): boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "first-meal", title: "첫 식사", description: "처음으로 음식을 건넸어요.", coins: 45, xp: 20, check: (s) => s.stats.meals >= 1 },
  { id: "first-bath", title: "첫 목욕", description: "처음으로 청결 관리를 마쳤어요.", coins: 45, xp: 20, check: (s) => s.stats.baths >= 1 },
  { id: "first-sleep", title: "첫 수면", description: "처음으로 푹 쉬었어요.", coins: 45, xp: 20, check: (s) => s.stats.sleeps >= 1 },
  { id: "first-game", title: "첫 미니게임", description: "첫 게임을 완주했어요.", coins: 55, xp: 25, check: (s) => s.stats.minigames >= 1 },
  { id: "score-1000", title: "파도 위의 집중", description: "누적 점수 1,000점을 기록했어요.", coins: 100, xp: 50, check: (s) => s.stats.totalMinigameScore >= 1000 },
  { id: "coins-1000", title: "든든한 탐험 자금", description: "코인 1,000개를 보유했어요.", coins: 80, xp: 40, check: (s) => s.coins >= 1000 },
  { id: "first-outfit", title: "새로운 스타일", description: "처음으로 의상을 구매했어요.", coins: 70, xp: 35, check: (s) => s.stats.purchases >= 1 },
  { id: "first-theme", title: "공간의 변화", description: "처음으로 방 테마를 바꿨어요.", coins: 70, xp: 35, check: (s) => s.stats.themeChanges >= 1 },
  { id: "streak-3", title: "다시 만난 세 번의 아침", description: "3일 연속 돌아왔어요.", coins: 120, xp: 55, check: (s) => s.loginStreak >= 3 },
  { id: "all-80", title: "균형 잡힌 하루", description: "모든 상태가 80 이상이에요.", coins: 120, xp: 60, check: (s) => [s.needs.satiety, s.needs.hygiene, s.needs.energy, s.needs.joy].every((v) => v >= 80) },
  { id: "level-5", title: "Coast Keeper", description: "Level 5에 도달했어요.", coins: 150, xp: 0, check: (s) => s.level >= 5 },
  { id: "all-games", title: "생태 탐험가", description: "서로 다른 Ocean 게임 세 가지를 경험했어요.", coins: 180, xp: 80, check: (s) => new Set(s.stats.minigameIds).size >= 3 }
];

export function unlockAchievements(save: GameSave, now = new Date()): GameSave {
  const unlocked = new Set(save.achievements.map((achievement) => achievement.id));
  const fresh = ACHIEVEMENTS.filter((achievement) => !unlocked.has(achievement.id) && achievement.check(save));
  if (!fresh.length) return save;
  const achievements = [
    ...save.achievements,
    ...fresh.map((achievement) => ({ id: achievement.id, unlockedAt: now.toISOString(), claimed: true as const }))
  ];
  const notifications = fresh.map((achievement) => ({
    id: `achievement-${achievement.id}-${now.getTime()}`,
    title: `업적 달성 · ${achievement.title}`,
    body: achievement.description,
    kind: "achievement" as const,
    createdAt: now.toISOString()
  }));
  return {
    ...save,
    achievements,
    coins: save.coins + fresh.reduce((sum, achievement) => sum + achievement.coins, 0),
    xp: save.xp + fresh.reduce((sum, achievement) => sum + achievement.xp, 0),
    notifications: [...notifications, ...save.notifications].slice(0, 30)
  };
}
