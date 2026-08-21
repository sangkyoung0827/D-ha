import { openDB, type IDBPDatabase } from "idb";
import type { GameSave } from "../domain/types";
import { migrateSave, parseImportedSave, type RecoveryResult } from "./migrations";

const DB_NAME = "diha-keeper";
const STORE_NAME = "game-save";
const DB_VERSION = 2;
const GUEST_SAVE_KEY = "primary";
const LOCAL_MIRROR_PREFIX = "diha-save-v7";
const PREVIOUS_LOCAL_MIRROR_PREFIXES = ["diha-save-v6", "diha-save-v5"] as const;
const LEGACY_LOCAL_MIRROR_KEYS = ["diha-keeper-primary-v3"] as const;
const LEGACY_LOCAL_MIRROR_KEY = "diha-primary-v4";
const memoryFallback = new Map<string, GameSave>();
let databasePromise: Promise<IDBPDatabase> | null = null;

export function persistenceKeyForOwner(userId: string | null): string {
  return userId ? `user:${userId}` : GUEST_SAVE_KEY;
}

function mirrorKeyForOwner(userId: string | null): string {
  return `${LOCAL_MIRROR_PREFIX}:${userId ? `user:${userId}` : "guest"}`;
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function loadLocalMirror(userId: string | null): RecoveryResult | null {
  try {
    const keys = userId
      ? [mirrorKeyForOwner(userId), ...PREVIOUS_LOCAL_MIRROR_PREFIXES.map((prefix) => `${prefix}:user:${userId}`)]
      : [mirrorKeyForOwner(null), ...PREVIOUS_LOCAL_MIRROR_PREFIXES.map((prefix) => `${prefix}:guest`), LEGACY_LOCAL_MIRROR_KEY, ...LEGACY_LOCAL_MIRROR_KEYS];
    return keys.reduce<RecoveryResult | null>((newest, key) => {
      const raw = globalThis.localStorage?.getItem(key);
      return newestResult(newest, raw ? parseImportedSave(raw) : null);
    }, null);
  } catch {
    return null;
  }
}

function saveLocalMirror(save: GameSave, userId: string | null): void {
  try {
    globalThis.localStorage?.setItem(mirrorKeyForOwner(userId), JSON.stringify(save));
    for (const prefix of PREVIOUS_LOCAL_MIRROR_PREFIXES) globalThis.localStorage?.removeItem(`${prefix}:${userId ? `user:${userId}` : "guest"}`);
    if (!userId) {
      globalThis.localStorage?.removeItem(LEGACY_LOCAL_MIRROR_KEY);
      for (const key of LEGACY_LOCAL_MIRROR_KEYS) globalThis.localStorage?.removeItem(key);
    }
  } catch {
    // IndexedDB and the in-memory fallback remain available when storage is blocked.
  }
}

function newestResult(primary: RecoveryResult | null, mirror: RecoveryResult | null): RecoveryResult | null {
  if (!primary || primary.status === "corrupt") return mirror ?? primary;
  if (!mirror || mirror.status === "corrupt") return primary;
  return new Date(mirror.save.lastSavedAt).getTime() > new Date(primary.save.lastSavedAt).getTime() ? mirror : primary;
}

async function database(): Promise<IDBPDatabase> {
  databasePromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    }
  });
  return databasePromise;
}

export async function loadGame(userId: string | null = null): Promise<RecoveryResult | null> {
  const storageKey = persistenceKeyForOwner(userId);
  const mirror = loadLocalMirror(userId);
  if (!canUseIndexedDb()) {
    const memorySave = memoryFallback.get(storageKey);
    return newestResult(memorySave ? migrateSave(memorySave) : null, mirror);
  }
  const db = await database();
  const raw = await db.get(STORE_NAME, storageKey);
  return newestResult(raw ? migrateSave(raw) : null, mirror);
}

export async function saveGame(save: GameSave, userId: string | null = null): Promise<void> {
  const storageKey = persistenceKeyForOwner(userId);
  memoryFallback.set(storageKey, structuredClone(save));
  saveLocalMirror(save, userId);
  if (!canUseIndexedDb()) return;
  const db = await database();
  await db.put(STORE_NAME, save, storageKey);
}

export async function clearGame(userId: string | null = null): Promise<void> {
  const storageKey = persistenceKeyForOwner(userId);
  memoryFallback.delete(storageKey);
  try {
    globalThis.localStorage?.removeItem(mirrorKeyForOwner(userId));
    for (const prefix of PREVIOUS_LOCAL_MIRROR_PREFIXES) globalThis.localStorage?.removeItem(`${prefix}:${userId ? `user:${userId}` : "guest"}`);
    if (!userId) {
      globalThis.localStorage?.removeItem(LEGACY_LOCAL_MIRROR_KEY);
      for (const key of LEGACY_LOCAL_MIRROR_KEYS) globalThis.localStorage?.removeItem(key);
    }
  } catch {
    // Continue clearing the primary store.
  }
  if (!canUseIndexedDb()) return;
  const db = await database();
  await db.delete(STORE_NAME, storageKey);
}
