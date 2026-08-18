import { openDB, type IDBPDatabase } from "idb";
import type { GameSave } from "../domain/types";
import { migrateSave, parseImportedSave, type RecoveryResult } from "./migrations";

const DB_NAME = "diha-keeper";
const STORE_NAME = "game-save";
const SAVE_KEY = "primary";
const LOCAL_MIRROR_KEY = "diha-primary-v4";
const LEGACY_LOCAL_MIRROR_KEYS = ["diha-keeper-primary-v3"] as const;
let memoryFallback: GameSave | null = null;
let databasePromise: Promise<IDBPDatabase> | null = null;

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function loadLocalMirror(): RecoveryResult | null {
  try {
    const keys = [LOCAL_MIRROR_KEY, ...LEGACY_LOCAL_MIRROR_KEYS];
    return keys.reduce<RecoveryResult | null>((newest, key) => {
      const raw = globalThis.localStorage?.getItem(key);
      return newestResult(newest, raw ? parseImportedSave(raw) : null);
    }, null);
  } catch {
    return null;
  }
}

function saveLocalMirror(save: GameSave): void {
  try {
    globalThis.localStorage?.setItem(LOCAL_MIRROR_KEY, JSON.stringify(save));
    for (const key of LEGACY_LOCAL_MIRROR_KEYS) globalThis.localStorage?.removeItem(key);
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
  databasePromise ??= openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    }
  });
  return databasePromise;
}

export async function loadGame(): Promise<RecoveryResult | null> {
  const mirror = loadLocalMirror();
  if (!canUseIndexedDb()) return newestResult(memoryFallback ? migrateSave(memoryFallback) : null, mirror);
  const db = await database();
  const raw = await db.get(STORE_NAME, SAVE_KEY);
  return newestResult(raw ? migrateSave(raw) : null, mirror);
}

export async function saveGame(save: GameSave): Promise<void> {
  memoryFallback = structuredClone(save);
  saveLocalMirror(save);
  if (!canUseIndexedDb()) return;
  const db = await database();
  await db.put(STORE_NAME, save, SAVE_KEY);
}

export async function clearGame(): Promise<void> {
  memoryFallback = null;
  try {
    globalThis.localStorage?.removeItem(LOCAL_MIRROR_KEY);
    for (const key of LEGACY_LOCAL_MIRROR_KEYS) globalThis.localStorage?.removeItem(key);
  } catch {
    // Continue clearing the primary store.
  }
  if (!canUseIndexedDb()) return;
  const db = await database();
  await db.delete(STORE_NAME, SAVE_KEY);
}
