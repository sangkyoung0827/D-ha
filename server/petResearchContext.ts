import { ITEM_BY_ID } from "../src/domain/catalog.js";
import type { GameSave } from "../src/domain/types.js";

export interface PetResearchAccountSummary {
  scope: "current-authenticated-account";
  savedAt: string;
  pet: GameSave["profile"];
  currentStatus: {
    needs: GameSave["needs"];
    level: number;
    xp: number;
    coins: number;
    lastCareAt: string | null;
  };
  game: {
    tutorialComplete: boolean;
    loginStreak: number;
    lastLoginDate: string;
    roomTheme: string;
    decorations: string[];
    notifications: Array<{ title: string; body: string; kind: string; createdAt: string }>;
  };
  activity: GameSave["stats"];
  dailyGoals: GameSave["dailyGoals"];
  achievements: string[];
  inventory: Array<{ name: string; quantity: number }>;
  equipped: Record<string, string | null>;
  medical: {
    bloodType: string;
    hospitalName: string;
    connectionStatus: string;
    records: Array<{
      visitDate: string;
      hospitalName: string;
      diagnosis: string;
      treatment: string;
      note: string;
      nextVisitDate: string | null;
    }>;
  };
  diary: Array<{ title: string; memoryDate: string; note: string; hasPhoto: boolean }>;
  explorations: Array<{
    placeName: string;
    visitDate: string;
    note: string;
    distanceMeters: number;
    durationSeconds: number;
    hasRecordedRoute: boolean;
  }>;
  highScores: GameSave["highScores"];
}

export function buildPetResearchAccountSummary(save: GameSave): PetResearchAccountSummary {
  return {
    scope: "current-authenticated-account",
    savedAt: save.lastSavedAt,
    pet: { ...save.profile },
    currentStatus: {
      needs: { ...save.needs },
      level: save.level,
      xp: save.xp,
      coins: save.coins,
      lastCareAt: save.lastCareAt
    },
    game: {
      tutorialComplete: save.tutorialComplete,
      loginStreak: save.loginStreak,
      lastLoginDate: save.lastLoginDate,
      roomTheme: save.roomTheme,
      decorations: [...save.decorations],
      notifications: save.notifications.map((notification) => ({
        title: plainData(notification.title, 100),
        body: plainData(notification.body, 180),
        kind: notification.kind,
        createdAt: notification.createdAt
      }))
    },
    activity: { ...save.stats, minigameIds: [...save.stats.minigameIds] },
    dailyGoals: save.dailyGoals.map((goal) => ({ ...goal })),
    achievements: save.achievements.map((achievement) => achievement.id),
    inventory: Object.entries(save.inventory)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({ name: ITEM_BY_ID[id]?.name ?? id, quantity })),
    equipped: Object.fromEntries(Object.entries(save.equipped).map(([slot, id]) => [slot, id ? ITEM_BY_ID[id]?.name ?? id : null])),
    medical: {
      bloodType: plainData(save.petMedical.bloodType, 30),
      hospitalName: plainData(save.petMedical.hospital.hospitalName, 80),
      connectionStatus: save.petMedical.hospital.status,
      records: save.petMedical.records.map((record) => ({
        visitDate: record.visitDate,
        hospitalName: plainData(record.hospitalName, 80),
        diagnosis: plainData(record.diagnosis, 120),
        treatment: plainData(record.treatment, 180),
        note: plainData(record.note, 180),
        nextVisitDate: record.nextVisitDate
      }))
    },
    diary: save.petMemories.map((memory) => ({
      title: plainData(memory.title, 60),
      memoryDate: memory.memoryDate,
      note: plainData(memory.note, 220),
      hasPhoto: Boolean(memory.photoDataUrl)
    })),
    explorations: save.petExplorations.map((exploration) => ({
      placeName: plainData(exploration.placeName, 80),
      visitDate: exploration.visitDate,
      note: plainData(exploration.note, 220),
      distanceMeters: Math.round(exploration.distanceMeters),
      durationSeconds: exploration.durationSeconds,
      hasRecordedRoute: exploration.route.length > 0
    })),
    highScores: { ...save.highScores }
  };
}

export function decodeFirestoreDocumentSave(document: unknown): unknown {
  if (!document || typeof document !== "object") return undefined;
  const fields = (document as { fields?: unknown }).fields;
  const decoded = decodeFirestoreValue({ mapValue: { fields } });
  if (!decoded || typeof decoded !== "object") return undefined;
  return (decoded as Record<string, unknown>).save;
}

export function decodeFirestoreDocumentOwner(document: unknown): string | undefined {
  if (!document || typeof document !== "object") return undefined;
  const fields = (document as { fields?: unknown }).fields;
  const decoded = decodeFirestoreValue({ mapValue: { fields } });
  if (!decoded || typeof decoded !== "object") return undefined;
  const ownerId = (decoded as Record<string, unknown>).ownerId;
  return typeof ownerId === "string" ? ownerId : undefined;
}

export function isAccountRecordQuestion(question: string): boolean {
  return /(?:내|우리|등록|저장|기록|일기|추억|탐험|어디|어디어디|가봤|다녀|여행|산책|활동\s*지역|병원|진료|혈액형|상태|에너지|배고|포만|위생|레벨|코인|인벤토리|보관함|업적|점수)/i.test(question);
}

export function requiresAcademicEvidence(question: string): boolean {
  return /(?:건강|질병|증상|아프|통증|약|투약|치료|예방|영양|식단|사료|급여|용량|dha|epa|오메가|피부|모질|관절|인지|행동|불안|스트레스|수면|비만|체중)/i.test(question);
}

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  const field = value as Record<string, unknown>;
  if ("nullValue" in field) return null;
  if (typeof field.stringValue === "string") return field.stringValue;
  if (typeof field.booleanValue === "boolean") return field.booleanValue;
  if (typeof field.integerValue === "string" || typeof field.integerValue === "number") return Number(field.integerValue);
  if (typeof field.doubleValue === "number" || typeof field.doubleValue === "string") return Number(field.doubleValue);
  if (typeof field.timestampValue === "string") return field.timestampValue;
  if (field.arrayValue && typeof field.arrayValue === "object") {
    const values = (field.arrayValue as { values?: unknown[] }).values ?? [];
    return values.map(decodeFirestoreValue);
  }
  if (field.mapValue && typeof field.mapValue === "object") {
    const fields = (field.mapValue as { fields?: Record<string, unknown> }).fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, nested]) => [key, decodeFirestoreValue(nested)]));
  }
  return undefined;
}

function plainData(value: string, limit: number): string {
  const withoutControls = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("");
  return withoutControls.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}
