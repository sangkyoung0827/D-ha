export interface GameAccount {
  uid: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
}

export type AccountStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";

export interface AccountSnapshot {
  status: AccountStatus;
  account: GameAccount | null;
}

export interface AccountAdapter {
  subscribe(listener: (snapshot: AccountSnapshot) => void): () => void;
  signInWithGoogle(): Promise<GameAccount | null>;
  signOut(): Promise<void>;
}
