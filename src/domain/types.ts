import type { PetProfile } from "./pet";

export type RoomId =
  | "studio"
  | "kitchen"
  | "bathroom"
  | "bedroom"
  | "wellness"
  | "game-room"
  | "wardrobe"
  | "shop";

export type NeedKey = "satiety" | "hygiene" | "energy" | "joy" | "condition";

export interface NeedValues {
  satiety: number;
  hygiene: number;
  energy: number;
  joy: number;
  condition: number;
}

export type ItemCategory =
  | "food"
  | "wellness"
  | "dha-bundle"
  | "pet-health"
  | "ocean-gear"
  | "top"
  | "bottom"
  | "shoes"
  | "accessory"
  | "theme"
  | "decoration";

export type WearableSlot = "top" | "bottom" | "shoes" | "accessory";

export interface ItemDefinition {
  id: string;
  category: ItemCategory;
  name: string;
  description: string;
  price: number;
  requiredLevel: number;
  effects?: Partial<Omit<NeedValues, "condition">>;
  wearableSlot?: WearableSlot;
  themeId?: string;
  color: string;
  symbol: string;
}

export interface AchievementState {
  id: string;
  unlockedAt: string;
  claimed: true;
}

export interface DailyGoal {
  id: "feed" | "wash" | "play" | "balanced";
  label: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface GameStats {
  meals: number;
  baths: number;
  sleeps: number;
  minigames: number;
  minigameIds: string[];
  totalMinigameScore: number;
  purchases: number;
  themeChanges: number;
  careActions: number;
}

export interface GameSettings {
  sound: boolean;
  vibration: boolean;
  reducedMotion: boolean;
  notifications: boolean;
}

export interface GameNotification {
  id: string;
  title: string;
  body: string;
  kind: "care" | "achievement" | "level" | "purchase" | "daily" | "return" | "system";
  createdAt: string;
}

export interface GameReward {
  coins: number;
  xp: number;
}

export type MiniGameId =
  | "bubble-focus"
  | "current-run"
  | "reef-memory"
  | "ocean-run"
  | "jump-up"
  | "beach-volleyball"
  | "beach-pingpong"
  | "beach-football"
  | "open-water-catch"
  | "reef-surf"
  | "cave-sonar"
  | "deepsea-descent";

export interface MiniGameResult {
  gameId: MiniGameId;
  score: number;
  success: boolean;
  durationMs: number;
  endReason?: "dha-depleted";
}

export interface GameSave {
  version: 5;
  profile: PetProfile;
  tutorialComplete: boolean;
  needs: NeedValues;
  lastSavedAt: string;
  lastCareAt: string | null;
  coins: number;
  xp: number;
  level: number;
  inventory: Record<string, number>;
  equipped: Record<WearableSlot, string | null>;
  roomTheme: string;
  decorations: string[];
  achievements: AchievementState[];
  dailyDate: string;
  dailyGoals: DailyGoal[];
  highScores: Record<string, number>;
  settings: GameSettings;
  loginStreak: number;
  lastLoginDate: string;
  stats: GameStats;
  greetedFriends: Record<string, string>;
  notifications: GameNotification[];
}

export interface MiniGameDefinition {
  id: MiniGameResult["gameId"];
  title: string;
  description: string;
  requiredLevel: number;
  durationSeconds?: number;
  start(): void;
  pause(): void;
  resume(): void;
  finish(result: MiniGameResult): void;
  calculateReward(result: MiniGameResult): GameReward;
}
