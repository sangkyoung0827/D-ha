import { useEffect, useState } from "react";
import {
  listenForPwaInstall,
  requestPwaInstall,
  shouldOfferIosGuide,
  type DeferredInstallPrompt
} from "../../platform/pwa/install";
import { startPwaUpdate } from "../../platform/pwa/update";

export function PwaExperience() {
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => listenForPwaInstall({
    onPrompt: setInstallPrompt,
    onInstalled: () => {
      setInstallPrompt(null);
      setInstallDismissed(true);
      setShowIosGuide(false);
    }
  }), []);

  useEffect(() => startPwaUpdate({
    onNeedRefresh: (update) => setApplyUpdate(() => update),
    onOfflineReady: () => setOfflineReady(true)
  }), []);

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => setOfflineReady(false), 3_200);
    return () => window.clearTimeout(timer);
  }, [offlineReady]);

  const installVisible = !installDismissed && (Boolean(installPrompt) || shouldOfferIosGuide());

  return <>
    {installVisible && <aside className="pwa-install-card" aria-label="Diha 앱 설치">
      <img src="/icon.svg" alt="" aria-hidden="true" />
      <span><strong>Diha 설치하기</strong><small>홈 화면에서 바로 시작하세요</small></span>
      <button type="button" onClick={async () => {
        if (installPrompt) {
          const outcome = await requestPwaInstall(installPrompt);
          if (outcome === "accepted") setInstallPrompt(null);
          return;
        }
        setShowIosGuide(true);
      }}>설치</button>
      <button type="button" className="pwa-card-close" aria-label="설치 안내 닫기" onClick={() => setInstallDismissed(true)}>×</button>
    </aside>}

    {showIosGuide && <div className="pwa-guide-backdrop" role="presentation" onClick={() => setShowIosGuide(false)}>
      <section className="pwa-ios-guide" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title" onClick={(event) => event.stopPropagation()}>
        <img src="/icon.svg" alt="Diha 앱 아이콘" />
        <p>IPHONE · IPAD</p>
        <h2 id="pwa-ios-title">Diha를 홈 화면에 추가하기</h2>
        <ol><li>Safari 아래의 <strong>공유</strong> 버튼을 누르세요.</li><li><strong>홈 화면에 추가</strong>를 선택하세요.</li><li>오른쪽 위의 <strong>추가</strong>를 누르면 완료됩니다.</li></ol>
        <button type="button" onClick={() => setShowIosGuide(false)}>확인</button>
      </section>
    </div>}

    {applyUpdate && <aside className="pwa-update-card" role="status">
      <span><strong>새 버전이 있어요</strong><small>최신 Diha로 안전하게 업데이트합니다.</small></span>
      <button type="button" onClick={() => void applyUpdate()}>업데이트</button>
      <button type="button" className="pwa-card-close" aria-label="업데이트 나중에" onClick={() => setApplyUpdate(null)}>×</button>
    </aside>}

    {offlineReady && <div className="pwa-offline-ready" role="status">Diha를 오프라인에서도 열 수 있어요.</div>}
  </>;
}
