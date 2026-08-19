import type { MiniGameId, MiniGameResult, NeedValues } from "./types";

export type OceanMode = "exploration" | "coastal-road";
export type OceanZoneId = "beach" | "open-water" | "surf" | "cave" | "deepsea";
export type OceanRunChapterId = "beach" | "surf" | "cave" | "deepsea";

export interface OceanGameInfo {
  id: MiniGameId;
  title: string;
  shortTitle: string;
  description: string;
  instruction: string;
  requiredLevel: number;
  durationSeconds: number;
  accent: string;
}

export interface OceanZoneInfo {
  id: OceanZoneId;
  title: string;
  subtitle: string;
  depth: string;
  description: string;
  glyph: string;
  games: OceanGameInfo[];
}

export interface OceanRunChapter {
  id: OceanRunChapterId;
  number: string;
  title: string;
  mode: string;
  hazards: string;
  requiredItemId: "ocean-oxygen-tank" | "ocean-submarine" | null;
}

export const OCEAN_RUN_GAME: OceanGameInfo = {
  id: "ocean-run",
  title: "Ocean Run",
  shortTitle: "오션 런",
  description: "해변에서 심해까지 하나의 흐름으로 달리고, 서핑하고, 잠수하는 연속 러너 게임이에요.",
  instruction: "좌우로 레인을 바꾸고 점프로 장애물을 피하세요.",
  requiredLevel: 1,
  durationSeconds: 48,
  accent: "#22a9a5"
};

export const JUMP_UP_GAME: OceanGameInfo = {
  id: "jump-up",
  title: "Jump Up",
  shortTitle: "점프 업",
  description: "발판을 연속으로 밟아 구름과 대기권을 지나 우주까지 올라가는 점프 게임이에요.",
  instruction: "좌우로 이동해 다음 발판과 DHA 알약을 향해 착지하세요.",
  requiredLevel: 1,
  durationSeconds: 50,
  accent: "#6c74d8"
};

export const OCEAN_RUN_CHAPTERS: OceanRunChapter[] = [
  { id: "beach", number: "01", title: "해변", mode: "보드를 들고 달리기", hazards: "야자수", requiredItemId: null },
  { id: "surf", number: "02", title: "파도", mode: "서핑보드 라이딩", hazards: "상어 · 해파리", requiredItemId: null },
  { id: "cave", number: "03", title: "해저 동굴", mode: "산소통 다이빙", hazards: "종유석 · 해류 분출 · 암초", requiredItemId: "ocean-oxygen-tank" },
  { id: "deepsea", number: "04", title: "심해", mode: "잠수함 탐험", hazards: "해파리 · 기뢰 · 심해 암벽", requiredItemId: "ocean-submarine" }
];

export const OCEAN_ZONES: OceanZoneInfo[] = [
  {
    id: "beach",
    title: "해변",
    subtitle: "Ocean Run 출발점",
    depth: "0 m",
    description: "서핑보드를 들고 모래사장에서 심해까지 이어지는 하나의 탐험을 시작해요.",
    glyph: "☀",
    games: [OCEAN_RUN_GAME, JUMP_UP_GAME]
  },
  { id: "open-water", title: "바다", subtitle: "파도 진입", depth: "SURFACE", description: "달리기에서 서핑으로 자연스럽게 이어지는 구간이에요.", glyph: "≈", games: [] },
  { id: "surf", title: "서핑", subtitle: "파도를 읽는 구간", depth: "SURFACE", description: "물고기 떼와 상어, 큰 파도를 피해요.", glyph: "⌁", games: [] },
  { id: "cave", title: "해저 동굴", subtitle: "산소통 다이빙", depth: "-80 m", description: "산소통을 메고 빛나는 동굴 장애물을 통과해요.", glyph: "◒", games: [] },
  { id: "deepsea", title: "심해", subtitle: "잠수함 탐험", depth: "-1,000 m", description: "잠수함으로 가장 깊은 장애물 구간을 돌파해요.", glyph: "✦", games: [] }
];

export const OCEAN_GAME_BY_ID = new Map<MiniGameId, OceanGameInfo>([
  [OCEAN_RUN_GAME.id, OCEAN_RUN_GAME],
  [JUMP_UP_GAME.id, JUMP_UP_GAME]
]);
export const OCEAN_GAME_IDS = new Set<MiniGameId>(OCEAN_GAME_BY_ID.keys());

export function isOceanGame(id: MiniGameId): boolean {
  return OCEAN_GAME_IDS.has(id);
}

export function oceanZoneForGame(id: MiniGameId): OceanZoneId | null {
  return id === OCEAN_RUN_GAME.id || id === JUMP_UP_GAME.id ? "beach" : null;
}

export function oceanGameNeedEffects(result: MiniGameResult): Partial<Omit<NeedValues, "condition">> {
  return result.gameId === "ocean-run"
    ? { joy: result.success ? 16 : 8, energy: -7 }
    : result.gameId === "jump-up"
      ? { joy: result.success ? 18 : 9, energy: -6 }
    : { joy: result.success ? 12 : 6, energy: -4 };
}

export function oceanCompletionCopy(result: MiniGameResult): string | null {
  if (result.gameId === "ocean-run") return result.success ? "해변부터 심해까지 Ocean Run 완주!" : "Ocean Run 탐험 기록을 저장했어요.";
  if (result.gameId === "jump-up") return result.success ? "Jump Up으로 우주에 도착했어요!" : "Jump Up 최고 고도를 저장했어요.";
  return null;
}

export function ownsOceanGear(inventory: Record<string, number>) {
  return {
    oxygenTank: (inventory["ocean-oxygen-tank"] ?? 0) > 0,
    submarine: (inventory["ocean-submarine"] ?? 0) > 0
  };
}
