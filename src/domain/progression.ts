export const LEVEL_THRESHOLDS = [0, 80, 190, 340, 540, 790, 1090, 1450, 1870, 2350, 2900] as const;

export function levelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  for (let level = LEVEL_THRESHOLDS.length - 1; level >= 1; level -= 1) {
    if (safeXp >= (LEVEL_THRESHOLDS[level] ?? 0)) return level + 1;
  }
  return 1;
}

export function xpProgress(xp: number): { current: number; required: number; ratio: number } {
  const level = Math.min(levelFromXp(xp), 10);
  const start = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const end = LEVEL_THRESHOLDS[level] ?? start + 650;
  const current = Math.max(0, xp - start);
  const required = Math.max(1, end - start);
  return { current, required, ratio: Math.min(1, current / required) };
}

export function keeperRank(level: number): string {
  if (level >= 30) return "Deep Sea Guardian";
  if (level >= 20) return "Coral Researcher";
  if (level >= 15) return "Ocean Explorer";
  if (level >= 10) return "Reef Diha";
  if (level >= 5) return "Coast Diha";
  return "Rookie Diha";
}
