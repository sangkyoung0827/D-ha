import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { isE2eAccountMode, isFirebaseConfigured } from "../firebase/client";
import { E2eAccountAdapter } from "./E2eAccountAdapter";
import type { AccountAdapter, AccountSnapshot, GameAccount } from "./account";

interface AccountContextValue extends AccountSnapshot {
  busy: boolean;
  error: string | null;
  signInWithGoogle(): Promise<GameAccount | null>;
  signOut(): Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/popup-closed-by-user") return "Google 로그인 창이 닫혔어요. 다시 시도해 주세요.";
  if (code === "auth/popup-blocked") return "팝업이 차단됐어요. 이 사이트의 팝업을 허용해 주세요.";
  if (code === "auth/network-request-failed") return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  if (code === "auth/unauthorized-domain") return "현재 주소가 Google 로그인 허용 목록에 없습니다.";
  return "Google 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const configured = isE2eAccountMode() || isFirebaseConfigured();
  const [adapter, setAdapter] = useState<AccountAdapter | null>(() => isE2eAccountMode() ? new E2eAccountAdapter() : null);
  const [snapshot, setSnapshot] = useState<AccountSnapshot>(configured
    ? { status: "loading", account: null }
    : { status: "unconfigured", account: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adapter || !isFirebaseConfigured() || isE2eAccountMode()) return;
    let active = true;
    void import("./FirebaseAccountAdapter").then(({ FirebaseAccountAdapter }) => {
      if (active) setAdapter(new FirebaseAccountAdapter());
    });
    return () => { active = false; };
  }, [adapter]);

  useEffect(() => adapter?.subscribe(setSnapshot), [adapter]);

  const signInWithGoogle = useCallback(async () => {
    if (!adapter) {
      setError("Google 로그인 서버 설정이 아직 연결되지 않았어요.");
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      return await adapter.signInWithGoogle();
    } catch (signInError) {
      setError(authErrorMessage(signInError));
      return null;
    } finally {
      setBusy(false);
    }
  }, [adapter]);

  const signOut = useCallback(async () => {
    if (!adapter) return;
    setBusy(true);
    setError(null);
    try {
      await adapter.signOut();
    } catch {
      setError("로그아웃하지 못했어요. 네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [adapter]);

  return <AccountContext.Provider value={{ ...snapshot, busy, error, signInWithGoogle, signOut }}>{children}</AccountContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("AccountProvider 안에서 useAccount를 사용해야 합니다.");
  return value;
}
