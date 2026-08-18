import type { MiniGameId, MiniGameResult, NeedValues } from "./types";

export type OceanMode = "exploration" | "coastal-road";
export type OceanZoneId = "beach" | "open-water" | "surf" | "cave" | "deepsea";

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

export const OCEAN_ZONES: OceanZoneInfo[] = [
  {
    id: "beach",
    title: "해변",
    subtitle: "모래 위 워밍업",
    depth: "0 m",
    description: "가볍게 몸을 움직이며 첫 탐험 배지를 모아요.",
    glyph: "☀",
    games: [
      { id: "beach-volleyball", title: "코스트 랠리", shortTitle: "비치발리볼", description: "컴퓨터 선수의 공을 직접 터치해 받아치며 5점 랠리를 겨뤄요.", instruction: "날아오는 공이 빛나면 공 자체를 터치하세요.", requiredLevel: 1, durationSeconds: 30, accent: "#ffbe61" },
      { id: "beach-pingpong", title: "선셋 핑퐁", shortTitle: "탁구", description: "컴퓨터 선수와 탁구공을 직접 주고받아 먼저 5점을 내요.", instruction: "탁구공이 손앞에서 빛날 때 공 자체를 터치하세요.", requiredLevel: 1, durationSeconds: 30, accent: "#ef8270" },
      { id: "beach-football", title: "샌드 스트라이커", shortTitle: "축구", description: "컴퓨터 골키퍼의 움직임을 읽고 다섯 번의 승부차기를 해요.", instruction: "조준 원의 위치를 보고 공 자체를 터치해 슛하세요.", requiredLevel: 1, durationSeconds: 30, accent: "#4fbd8f" }
    ]
  },
  {
    id: "open-water",
    title: "바다 수영",
    subtitle: "직접 헤엄쳐 포획",
    depth: "-12 m",
    description: "물살을 따라 헤엄치며 물고기를 잡아 게임 속 DHA를 섭취해요.",
    glyph: "≈",
    games: [
      { id: "open-water-catch", title: "블루 핀 스윔", shortTitle: "물고기 잡기", description: "화면을 눌러 헤엄치고 가까이 다가온 물고기를 직접 잡아요.", instruction: "물속을 터치해 이동하고 황금 물고기를 잡으세요.", requiredLevel: 1, durationSeconds: 38, accent: "#37b9c5" }
    ]
  },
  {
    id: "surf",
    title: "서핑보드",
    subtitle: "파도를 읽는 구간",
    depth: "SURFACE",
    description: "파도 에너지를 모으고 상어의 진로를 피해 롱 라이드를 완성해요.",
    glyph: "⌁",
    games: [
      { id: "reef-surf", title: "샤크 웨이브", shortTitle: "상어 피하기", description: "세 파도 라인을 오가며 상어를 피하고 좋은 파도를 타요.", instruction: "좌우 스와이프로 레인을 바꾸세요.", requiredLevel: 1, durationSeconds: 38, accent: "#287fa7" }
    ]
  },
  {
    id: "cave",
    title: "해저 동굴",
    subtitle: "빛 대신 반향으로",
    depth: "-80 m",
    description: "새로 설계한 소나 탐험입니다. 반향이 강해지는 순서를 기억해 안전한 길을 찾아요.",
    glyph: "◒",
    games: [
      { id: "cave-sonar", title: "에코 케이브", shortTitle: "소나 길찾기", description: "동굴 벽의 반향 신호를 짝지어 산소 포켓까지 이동해요.", instruction: "같은 소나 문양 두 개를 연속으로 찾으세요.", requiredLevel: 1, durationSeconds: 55, accent: "#625c9c" }
    ]
  },
  {
    id: "deepsea",
    title: "심해",
    subtitle: "마지막 하강 구간",
    depth: "-1,000 m",
    description: "빛나는 생명체를 기록하고 산소를 관리하며 가장 깊은 관측점에 도달해요.",
    glyph: "✦",
    games: [
      { id: "deepsea-descent", title: "미드나잇 디센트", shortTitle: "심해 하강", description: "잠수정으로 압력 균열을 피하고 생물 신호와 산소를 수집해요.", instruction: "좌우로 이동해 산소 구체를 모으세요.", requiredLevel: 1, durationSeconds: 42, accent: "#384d87" }
    ]
  }
];

export const OCEAN_GAME_BY_ID = new Map(OCEAN_ZONES.flatMap((zone) => zone.games).map((game) => [game.id, game]));
export const OCEAN_GAME_IDS = new Set<MiniGameId>(OCEAN_GAME_BY_ID.keys());

export function isOceanGame(id: MiniGameId): boolean {
  return OCEAN_GAME_IDS.has(id);
}

export function oceanZoneForGame(id: MiniGameId): OceanZoneId | null {
  return OCEAN_ZONES.find((zone) => zone.games.some((game) => game.id === id))?.id ?? null;
}

export function isOceanZoneUnlocked(zoneId: OceanZoneId, highScores: Record<string, number>): boolean {
  const index = OCEAN_ZONES.findIndex((zone) => zone.id === zoneId);
  if (index <= 0) return true;
  const previous = OCEAN_ZONES[index - 1];
  return Boolean(previous?.games.some((game) => (highScores[game.id] ?? 0) > 0));
}

export function oceanGameNeedEffects(result: MiniGameResult): Partial<Omit<NeedValues, "condition">> {
  if (result.gameId === "open-water-catch" && result.success) return { satiety: 18, joy: 9, energy: -6 };
  if (result.gameId === "reef-surf" || result.gameId === "deepsea-descent") return { joy: result.success ? 14 : 7, energy: -6 };
  return { joy: result.success ? 12 : 6, energy: -4 };
}

export function oceanCompletionCopy(result: MiniGameResult): string | null {
  if (result.gameId === "open-water-catch" && result.success) return "물고기 포획 성공 · 게임 속 DHA 섭취 완료";
  if (!isOceanGame(result.gameId)) return null;
  return result.success ? "다음 바다 구간이 열렸어요." : "탐험 기록을 저장했어요.";
}
