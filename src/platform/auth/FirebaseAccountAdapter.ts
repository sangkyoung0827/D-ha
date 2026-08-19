import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User
} from "firebase/auth";
import { getFirebaseClient } from "../firebase/client";
import type { AccountAdapter, AccountSnapshot, GameAccount } from "./account";

function toGameAccount(user: User): GameAccount {
  return {
    uid: user.uid,
    displayName: user.displayName?.trim() || "디하 플레이어",
    email: user.email ?? "",
    photoUrl: user.photoURL
  };
}

export class FirebaseAccountAdapter implements AccountAdapter {
  private auth = getAuth(getFirebaseClient());
  private authReady = setPersistence(this.auth, browserLocalPersistence)
    .then(() => getRedirectResult(this.auth))
    .then(() => undefined);

  constructor() {
    this.auth.useDeviceLanguage();
  }

  subscribe(listener: (snapshot: AccountSnapshot) => void): () => void {
    let active = true;
    let unsubscribe: () => void = () => {};
    const beginObserving = () => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(this.auth, (user) => {
        listener(user
          ? { status: "signed-in", account: toGameAccount(user) }
          : { status: "signed-out", account: null });
      });
    };
    void this.authReady.then(beginObserving, beginObserving);
    return () => {
      active = false;
      unsubscribe();
    };
  }

  async signInWithGoogle(): Promise<null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithRedirect(this.auth, provider);
    return null;
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  async getIdToken(): Promise<string | null> {
    await this.authReady;
    return this.auth.currentUser?.getIdToken() ?? null;
  }
}
