import { z } from "zod";
import { createDefaultSave } from "../domain/defaults";
import { MAX_EXPLORATION_TRACK_POINTS } from "../domain/exploration";
import type { GameSave } from "../domain/types";

const needsSchema = z.object({
  satiety: z.number().min(0).max(100),
  hygiene: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  joy: z.number().min(0).max(100),
  condition: z.number().min(0).max(100)
});

const petProfileSchema = z.object({
  name: z.string().trim().min(1).max(20),
  species: z.enum(["dog", "cat"]),
  breed: z.enum(["maltese", "poodle", "pomeranian", "bichon", "goldenRetriever", "koreanShorthair", "russianBlue", "britishShorthair", "persian", "siamese"]),
  furColor: z.enum(["snow", "cream", "apricot", "golden", "cocoa", "charcoal", "blue", "seal"]),
  pattern: z.enum(["solid", "bicolor", "tabby", "spotted", "points"]),
  collar: z.enum(["none", "teal", "coral", "navy", "gold"]),
  hat: z.enum(["none", "cap", "beanie", "sunhat"]),
  accessory: z.enum(["none", "round", "square", "sunglasses", "bandana"]),
  outfit: z.enum(["none", "tee", "hoodie", "sailor", "raincoat"])
});

export const gameSaveSchema: z.ZodType<GameSave> = z.object({
  version: z.literal(8),
  profile: petProfileSchema,
  tutorialComplete: z.boolean(),
  needs: needsSchema,
  feedingPlan: z.object({
    date: z.string(),
    dailyTarget: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    completedSlots: z.array(z.enum(["daily", "morning", "midday", "evening", "night"])).max(4)
  }),
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
  ),
  petMedical: z.object({
    bloodType: z.string().trim().max(30),
    microchipId: z.string().trim().max(40),
    hospital: z.object({
      hospitalName: z.string().trim().max(80),
      patientNumber: z.string().trim().max(50),
      status: z.enum(["not-connected", "pending", "connected"]),
      lastSyncedAt: z.iso.datetime().nullable()
    }),
    records: z.array(z.object({
      id: z.string(),
      visitDate: z.string().max(10),
      hospitalName: z.string().trim().max(80),
      diagnosis: z.string().trim().max(120),
      treatment: z.string().trim().max(300),
      note: z.string().trim().max(500),
      nextVisitDate: z.string().max(10).nullable(),
      source: z.enum(["manual", "hospital"]),
      createdAt: z.iso.datetime()
    })).max(80)
  }),
  petMemories: z.array(z.object({
    id: z.string(),
    title: z.string().trim().min(1).max(60),
    memoryDate: z.string().max(10),
    note: z.string().trim().max(500),
    photoDataUrl: z.string().startsWith("data:image/").max(350_000),
    createdAt: z.iso.datetime()
  })).max(24),
  petExplorations: z.array(z.object({
    id: z.string(),
    placeName: z.string().trim().min(1).max(80),
    visitDate: z.string().max(10),
    note: z.string().trim().max(500),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    route: z.array(z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(10_000),
      capturedAt: z.iso.datetime()
    })).max(MAX_EXPLORATION_TRACK_POINTS),
    distanceMeters: z.number().min(0).max(10_000_000),
    durationSeconds: z.number().int().min(0).max(604_800),
    createdAt: z.iso.datetime()
  })).max(80)
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
    if (version >= 1 && version <= 7) {
      const base = createDefaultSave(now);
      const legacyProfile = legacy.profile && typeof legacy.profile === "object" ? legacy.profile as Record<string, unknown> : {};
      const legacyName = typeof legacyProfile.name === "string" && legacyProfile.name.trim()
        ? legacyProfile.name.trim().slice(0, 20)
        : base.profile.name;
      const legacyExplorations = version <= 6 && Array.isArray(legacy.petExplorations)
        ? legacy.petExplorations.map((exploration) => exploration && typeof exploration === "object"
          ? { ...exploration, route: [], distanceMeters: 0, durationSeconds: 0 }
          : exploration)
        : Array.isArray(legacy.petExplorations) ? legacy.petExplorations : base.petExplorations;
      const merged: GameSave = {
        ...base,
        ...(legacy as Partial<GameSave>),
        version: 8,
        feedingPlan: base.feedingPlan,
        profile: version >= 5
          ? { ...base.profile, ...(legacyProfile as Partial<GameSave["profile"]>), name: legacyName }
          : { ...base.profile, name: legacyName },
        settings: { ...base.settings, ...((legacy.settings as Partial<GameSave["settings"]>) ?? {}) },
        stats: { ...base.stats, ...((legacy.stats as Partial<GameSave["stats"]>) ?? {}) },
        lastSavedAt: typeof legacy.lastSavedAt === "string" ? legacy.lastSavedAt : now.toISOString(),
        petExplorations: legacyExplorations as GameSave["petExplorations"]
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
