import type { GameSave } from "../../domain/types";
import { migrateSave, type RecoveryResult } from "../../store/migrations";
import { getFirebaseClient, isE2eAccountMode, isFirebaseConfigured } from "../firebase/client";

function cloudEnabled(): boolean {
  return isFirebaseConfigured() && !isE2eAccountMode();
}

export async function loadCloudGame(userId: string): Promise<RecoveryResult | null> {
  if (!cloudEnabled()) return null;
  const { doc, getDoc, getFirestore } = await import("firebase/firestore");
  const snapshot = await getDoc(doc(getFirestore(getFirebaseClient()), "users", userId, "game", "primary"));
  if (!snapshot.exists()) return null;
  return migrateSave(snapshot.data().save);
}

export async function saveCloudGame(userId: string, save: GameSave): Promise<void> {
  if (!cloudEnabled()) return;
  const { doc, getFirestore, serverTimestamp, setDoc } = await import("firebase/firestore");
  await setDoc(doc(getFirestore(getFirebaseClient()), "users", userId, "game", "primary"), {
    ownerId: userId,
    schemaVersion: save.version,
    save,
    updatedAt: serverTimestamp()
  });
}
