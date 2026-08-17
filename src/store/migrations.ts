import { z } from "zod";
import { createDefaultSave } from "../domain/defaults";
import type { GameSave } from "../domain/types";

const needsSchema = z.object({
  satiety: z.number().min(0).max(100),
  hygiene: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  joy: z.number().min(0).max(100),
  condition: z.number().min(0).max(100)
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(20),
  skinTone: z.enum(["sunrise", "sand", "cocoa", "deep"]),
  hairStyle: z.enum(["wave", "crop", "bun", "curl"]),
  hairColor: z.enum(["midnight", "coral", "chestnut", "silver"])
});

export const gameSaveSchema: z.ZodType<GameSave> = z.object({
  version: z.literal(3),
  profile: profileSchema,
  tutorialComplete: z.boolean(),
  needs: needsSchema,
  lastSavedAt: z.iso.datetime(),
  lastCareAt: z.iso.datetime().nullable(),
  coins: z.number().int().min(0),
  xp: z.number().int().min(0),
  level: z.number().int().min(1).max(99),
  inventory: z.record(z.string(), z.number().int().min(0)),
  equipped: z.object({
    top: z.string().nullable(),
    bottom: z.string().nullable(),
    shoes: z.string().nullable(),
    accessory: z.string().nullable()
  }),
  roomTheme: z.string(),
  decorations: z.array(z.string()),
  achievements: z.array(
    z.object({ id: z.string(), unlockedAt: z.iso.datetime(), claimed: z.literal(true) })
  ),
  dailyDate: z.string(),
  dailyGoals: z.array(
    z.object({
      id: z.enum(["feed", "wash", "play", "balanced"]),
      label: z.string(),
      progress: z.number().int().min(0),
      target: z.number().int().min(1),
      completed: z.boolean()
    })
  ),
  highScores: z.record(z.string(), z.number().int().min(0)),
  settings: z.object({
    sound: z.boolean(),
    vibration: z.boolean(),
    reducedMotion: z.boolean(),
    notifications: z.boolean()
  }),
  loginStreak: z.number().int().min(1),
  lastLoginDate: z.string(),
  stats: z.object({
    meals: z.number().int().min(0),
    baths: z.number().int().min(0),
    sleeps: z.number().int().min(0),
    minigames: z.number().int().min(0),
    minigameIds: z.array(z.string()),
    totalMinigameScore: z.number().int().min(0),
    purchases: z.number().int().min(0),
    themeChanges: z.number().int().min(0),
    careActions: z.number().int().min(0)
  }),
  greetedFriends: z.record(z.string(), z.string()),
  notifications: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      kind: z.enum(["care", "achievement", "level", "purchase", "daily", "return", "system"]),
      createdAt: z.iso.datetime()
    })
  )
});

export interface RecoveryResult {
  status: "valid" | "migrated" | "corrupt";
  save: GameSave;
  backup?: string;
  message?: string;
}

export function migrateSave(input: unknown, now = new Date()): RecoveryResult {
  const parsed = gameSaveSchema.safeParse(input);
  if (parsed.success) return { status: "valid", save: parsed.data };

  if (input && typeof input === "object") {
    const legacy = input as Record<string, unknown>;
    const version = Number(legacy.version ?? 1);
    if (version === 1 || version === 2) {
      const base = createDefaultSave(now);
      const merged: GameSave = {
        ...base,
        ...(legacy as Partial<GameSave>),
        version: 3,
        settings: { ...base.settings, ...((legacy.settings as Partial<GameSave["settings"]>) ?? {}) },
        stats: { ...base.stats, ...((legacy.stats as Partial<GameSave["stats"]>) ?? {}) },
        lastSavedAt: typeof legacy.lastSavedAt === "string" ? legacy.lastSavedAt : now.toISOString()
      };
      const migrated = gameSaveSchema.safeParse(merged);
      if (migrated.success) return { status: "migrated", save: migrated.data };
    }
  }

  return {
    status: "corrupt",
    save: createDefaultSave(now),
    backup: safeStringify(input),
    message: "저장 데이터를 검증하지 못했습니다. 백업을 내려받거나 새 게임을 시작할 수 있습니다."
  };
}

export function parseImportedSave(raw: string): RecoveryResult {
  try {
    return migrateSave(JSON.parse(raw));
  } catch {
    return {
      status: "corrupt",
      save: createDefaultSave(),
      backup: raw,
      message: "JSON 형식을 읽지 못했습니다."
    };
  }
}

function safeStringify(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return "저장 데이터를 문자열로 백업할 수 없습니다.";
  }
}
