import { useEffect, useState } from "react";
import {
  isPwaInstalled,
  listenForPwaInstall,
  requestPwaInstall,
  shouldOfferIosGuide,
  type DeferredInstallPrompt
} from "../../platform/pwa/install";
import { startPwaUpdate } from "../../platform/pwa/update";

export function PwaExperience() {
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installGuide, setInstallGuide] = useState<"ios" | "browser" | null>(null);
  const [installed, setInstalled] = useState(isPwaInstalled);
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => listenForPwaInstall({
    onPrompt: setInstallPrompt,
    onInstalled: () => {
      setInstallPrompt(null);
      setInstalled(true);
      setInstallGuide(null);
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

  return <>
    {!installed && <button className="pwa-download-button" type="button" onClick={async () => {
        if (installPrompt) {
          const outcome = await requestPwaInstall(installPrompt);
          if (outcome === "accepted") {
            setInstallPrompt(null);
            setInstalled(true);
          }
          return;
        }
        setInstallGuide(shouldOfferIosGuide() ? "ios" : "browser");
      }} aria-label="Diha 앱 다운로드">
        <span aria-hidden="true">↓</span>
        앱 다운로드
      </button>}

    {installGuide && <div className="pwa-guide-backdrop" role="presentation" onClick={() => setInstallGuide(null)}>
      <section className="pwa-ios-guide" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title" onClick={(event) => event.stopPropagation()}>
        <img src="/icon.svg" alt="Diha 앱 아이콘" />
        <p>{installGuide === "ios" ? "IPHONE · IPAD" : "APP INSTALL"}</p>
        <h2 id="pwa-ios-title">Diha 앱 다운로드</h2>
        {installGuide === "ios" ? <ol>
          <li>브라우저의 <strong>공유</strong> 버튼을 누르세요.</li>
          <li><strong>홈 화면에 추가</strong>를 선택하세요.</li>
          <li>오른쪽 위의 <strong>추가</strong>를 누르면 완료됩니다.</li>
        </ol> : <div className="pwa-browser-guide">
          <strong>이 브라우저에서는 자동 설치 창을 열 수 없어요.</strong>
          <span>Chrome 또는 Edge에서 이 사이트를 연 뒤, 옆의 ‘앱 다운로드’ 버튼을 다시 눌러주세요.</span>
        </div>}
        <button type="button" onClick={() => setInstallGuide(null)}>확인</button>
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
