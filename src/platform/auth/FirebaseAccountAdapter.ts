import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
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

  constructor() {
    this.auth.useDeviceLanguage();
  }

  subscribe(listener: (snapshot: AccountSnapshot) => void): () => void {
    void setPersistence(this.auth, browserLocalPersistence);
    return onAuthStateChanged(this.auth, (user) => {
      listener(user
        ? { status: "signed-in", account: toGameAccount(user) }
        : { status: "signed-out", account: null });
    });
  }

  async signInWithGoogle(): Promise<GameAccount> {
    await setPersistence(this.auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(this.auth, provider);
    return toGameAccount(result.user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }
}
