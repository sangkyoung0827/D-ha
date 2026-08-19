import type { CharacterProfile } from "../../domain/types";
import { useAccount } from "../../platform/auth/AccountProvider";
import { useGameStore } from "../../store/gameStore";

export function GoogleSignInScreen({ profile, returning = false }: { profile: CharacterProfile; returning?: boolean }) {
  const { status, account, busy, error, signInWithGoogle } = useAccount();
  const syncStatus = useGameStore((state) => state.syncStatus);
  const syncMessage = useGameStore((state) => state.syncMessage);
  const loading = busy || syncStatus === "syncing" || status === "loading";

  return (
    <main className="onboarding account-screen ocean-gradient" data-testid="account-gate">
      <div className="account-orbit" aria-hidden="true"><i /><i /><i /></div>
      <div className="account-character" aria-hidden="true">
        <span>{profile.name.slice(0, 1)}</span>
        <i>✦</i>
      </div>
      <p className="eyebrow">DIHA PLAYER ACCOUNT</p>
      <h1>{returning ? `${profile.name}의 항해를 이어갈까요?` : `${profile.name}을 안전하게 저장할까요?`}</h1>
      <p className="account-copy">
        Google 계정마다 캐릭터, 아이템, 코인과 게임 진행을 완전히 분리해 저장합니다.
      </p>
      <div className="account-benefits">
        <span><b>01</b><i>계정별 독립 저장</i></span>
        <span><b>02</b><i>다른 기기에서도 이어하기</i></span>
        <span><b>03</b><i>기기 저장과 클라우드 이중 보호</i></span>
      </div>
      {status === "signed-in" && account ? (
        <div className="account-sync-card" role="status">
          <span className="account-avatar">{account.photoUrl ? <img src={account.photoUrl} alt="" referrerPolicy="no-referrer" /> : account.displayName.slice(0, 1)}</span>
          <span><strong>{account.displayName}</strong><small>{syncMessage ?? "계정 확인 완료"}</small></span>
          <i className={syncStatus} aria-hidden="true" />
        </div>
      ) : (
        <button
          className="google-sign-in"
          type="button"
          disabled={loading || status === "unconfigured"}
          onClick={() => void signInWithGoogle()}
        >
          <span className="google-mark" aria-hidden="true"><i>G</i></span>
          <strong>{loading ? "계정 연결 중..." : "Google로 계속"}</strong>
        </button>
      )}
      {status === "unconfigured" && <p className="auth-error" role="alert">Google 로그인 서버 설정이 아직 연결되지 않았어요.</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <small className="account-privacy">로그인에는 Google의 이름·이메일·프로필 사진만 사용하며, 게임 저장은 본인 UID 경로에서만 읽고 쓸 수 있습니다.</small>
    </main>
  );
}
