import type { AccountAdapter, AccountSnapshot, GameAccount } from "./account";

const STORAGE_KEY = "diha-e2e-google-account";
const TEST_ACCOUNT: GameAccount = {
  uid: "e2e-google-user",
  displayName: "테스트 플레이어",
  email: "player@example.com",
  photoUrl: null
};

export class E2eAccountAdapter implements AccountAdapter {
  private listeners = new Set<(snapshot: AccountSnapshot) => void>();

  subscribe(listener: (snapshot: AccountSnapshot) => void): () => void {
    this.listeners.add(listener);
    queueMicrotask(() => listener(this.snapshot()));
    return () => this.listeners.delete(listener);
  }

  async signInWithGoogle(): Promise<GameAccount> {
    localStorage.setItem(STORAGE_KEY, TEST_ACCOUNT.uid);
    this.emit();
    return TEST_ACCOUNT;
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    this.emit();
  }

  private snapshot(): AccountSnapshot {
    return localStorage.getItem(STORAGE_KEY) === TEST_ACCOUNT.uid
      ? { status: "signed-in", account: TEST_ACCOUNT }
      : { status: "signed-out", account: null };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
