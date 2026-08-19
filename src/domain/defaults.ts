import { createDailyGoals, localDateKey } from "./daily";
import { STARTER_INVENTORY } from "./catalog";
import type { PetProfile } from "./pet";
import type { GameSave } from "./types";

export const DEFAULT_PROFILE: PetProfile = {
  name: "마루",
  species: "dog",
  breed: "maltese",
  furColor: "snow",
  pattern: "solid",
  collar: "teal",
  hat: "none",
  accessory: "none",
  outfit: "tee"
};

export function createDefaultSave(now = new Date(), profile = DEFAULT_PROFILE): GameSave {
  const date = localDateKey(now);
  return {
    version: 5,
    profile,
    tutorialComplete: false,
    needs: { satiety: 78, hygiene: 76, energy: 72, joy: 80, condition: 77 },
    lastSavedAt: now.toISOString(),
    lastCareAt: null,
    coins: 500,
    xp: 0,
    level: 1,
    inventory: { ...STARTER_INVENTORY },
    equipped: {
      top: profile.outfit === "tee" ? "top-rookie" : null,
      bottom: null,
      shoes: null,
      accessory: null
    },
    roomTheme: "sunlab",
    decorations: [],
    achievements: [],
    dailyDate: date,
    dailyGoals: createDailyGoals(),
    highScores: {},
    settings: { sound: true, vibration: true, reducedMotion: false, notifications: false },
    loginStreak: 1,
    lastLoginDate: date,
    stats: {
      meals: 0,
      baths: 0,
      sleeps: 0,
      minigames: 0,
      minigameIds: [],
      totalMinigameScore: 0,
      purchases: 0,
      themeChanges: 0,
      careActions: 0
    },
    greetedFriends: {},
    notifications: []
  };
}
