export interface PetResearchAccountSummary {
  scope: "current-authenticated-account";
  savedAt: string;
  pet: {
    name: string;
    species: string;
    breed: string;
    furColor: string;
    pattern: string;
    collar: string;
    hat: string;
    accessory: string;
    outfit: string;
  };
  currentStatus: {
    needs: { satiety: number; hygiene: number; energy: number; joy: number; condition: number };
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
  activity: {
    meals: number;
    baths: number;
    sleeps: number;
    minigames: number;
    minigameIds: string[];
    totalMinigameScore: number;
    purchases: number;
    themeChanges: number;
    careActions: number;
  };
  dailyGoals: Array<{ id: string; label: string; progress: number; target: number; completed: boolean }>;
  achievements: string[];
  inventory: Array<{ itemId: string; quantity: number }>;
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
  highScores: Record<string, number>;
}

export function buildPetResearchAccountSummary(value: unknown): PetResearchAccountSummary {
  const save = asRecord(value);
  const profile = asRecord(save.profile);
  const needs = asRecord(save.needs);
  const stats = asRecord(save.stats);
  const medical = asRecord(save.petMedical);
  const hospital = asRecord(medical.hospital);
  const equipped = asRecord(save.equipped);
  return {
    scope: "current-authenticated-account",
    savedAt: textValue(save.lastSavedAt, 40),
    pet: {
      name: textValue(profile.name, 30),
      species: textValue(profile.species, 20),
      breed: textValue(profile.breed, 50),
      furColor: textValue(profile.furColor, 30),
      pattern: textValue(profile.pattern, 30),
      collar: textValue(profile.collar, 30),
      hat: textValue(profile.hat, 30),
      accessory: textValue(profile.accessory, 30),
      outfit: textValue(profile.outfit, 30)
    },
    currentStatus: {
      needs: {
        satiety: finiteNumber(needs.satiety),
        hygiene: finiteNumber(needs.hygiene),
        energy: finiteNumber(needs.energy),
        joy: finiteNumber(needs.joy),
        condition: finiteNumber(needs.condition)
      },
      level: finiteNumber(save.level),
      xp: finiteNumber(save.xp),
      coins: finiteNumber(save.coins),
      lastCareAt: nullableText(save.lastCareAt, 40)
    },
    game: {
      tutorialComplete: save.tutorialComplete === true,
      loginStreak: finiteNumber(save.loginStreak),
      lastLoginDate: textValue(save.lastLoginDate, 20),
      roomTheme: textValue(save.roomTheme, 50),
      decorations: asArray(save.decorations).map((decoration) => textValue(decoration, 80)).filter(Boolean),
      notifications: asArray(save.notifications).map((value) => {
        const notification = asRecord(value);
        return {
          title: textValue(notification.title, 100),
          body: textValue(notification.body, 180),
          kind: textValue(notification.kind, 30),
          createdAt: textValue(notification.createdAt, 40)
        };
      })
    },
    activity: {
      meals: finiteNumber(stats.meals),
      baths: finiteNumber(stats.baths),
      sleeps: finiteNumber(stats.sleeps),
      minigames: finiteNumber(stats.minigames),
      minigameIds: asArray(stats.minigameIds).map((id) => textValue(id, 80)).filter(Boolean),
      totalMinigameScore: finiteNumber(stats.totalMinigameScore),
      purchases: finiteNumber(stats.purchases),
      themeChanges: finiteNumber(stats.themeChanges),
      careActions: finiteNumber(stats.careActions)
    },
    dailyGoals: asArray(save.dailyGoals).map((value) => {
      const goal = asRecord(value);
      return { id: textValue(goal.id, 40), label: textValue(goal.label, 100), progress: finiteNumber(goal.progress), target: finiteNumber(goal.target), completed: goal.completed === true };
    }),
    achievements: asArray(save.achievements).map((value) => textValue(asRecord(value).id, 80)).filter(Boolean),
    inventory: Object.entries(asRecord(save.inventory))
      .map(([itemId, quantity]) => ({ itemId: plainData(itemId, 100), quantity: finiteNumber(quantity) }))
      .filter((item) => item.quantity > 0),
    equipped: Object.fromEntries(Object.entries(equipped).map(([slot, itemId]) => [plainData(slot, 40), itemId === null ? null : textValue(itemId, 100)])),
    medical: {
      bloodType: textValue(medical.bloodType, 30),
      hospitalName: textValue(hospital.hospitalName, 80),
      connectionStatus: textValue(hospital.status, 30),
      records: asArray(medical.records).map((value) => {
        const record = asRecord(value);
        return {
          visitDate: textValue(record.visitDate, 20),
          hospitalName: textValue(record.hospitalName, 80),
          diagnosis: textValue(record.diagnosis, 120),
          treatment: textValue(record.treatment, 180),
          note: textValue(record.note, 180),
          nextVisitDate: nullableText(record.nextVisitDate, 20)
        };
      })
    },
    diary: asArray(save.petMemories).map((value) => {
      const memory = asRecord(value);
      return { title: textValue(memory.title, 60), memoryDate: textValue(memory.memoryDate, 20), note: textValue(memory.note, 220), hasPhoto: typeof memory.photoDataUrl === "string" && memory.photoDataUrl.startsWith("data:image/") };
    }),
    explorations: asArray(save.petExplorations).map((value) => {
      const exploration = asRecord(value);
      return {
        placeName: textValue(exploration.placeName, 80),
        visitDate: textValue(exploration.visitDate, 20),
        note: textValue(exploration.note, 220),
        distanceMeters: Math.round(finiteNumber(exploration.distanceMeters)),
        durationSeconds: Math.round(finiteNumber(exploration.durationSeconds)),
        hasRecordedRoute: asArray(exploration.route).length > 0
      };
    }),
    highScores: Object.fromEntries(Object.entries(asRecord(save.highScores)).map(([gameId, score]) => [plainData(gameId, 100), finiteNumber(score)]))
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, limit: number): string {
  return typeof value === "string" ? plainData(value, limit) : "";
}

function nullableText(value: unknown, limit: number): string | null {
  return value === null || value === undefined ? null : textValue(value, limit) || null;
}

function finiteNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
