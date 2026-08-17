import { useCallback, useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { GameCanvas } from "../game/GameCanvas";
import { gameBridge } from "../game/bridge/GameBridge";
import type { MiniGameResult, RoomId } from "../domain/types";
import { useGameStore } from "../store/gameStore";
import { Onboarding } from "../components/onboarding/Onboarding";
import { StatusBar } from "../components/game-ui/StatusBar";
import { RoomNav } from "../components/game-ui/RoomNav";
import { RoomActionPanel } from "../components/game-ui/RoomActionPanel";
import { AppMenu, OverlayHost } from "../components/game-ui/OverlayHost";
import { animateKeeperForOverlay } from "../components/game-ui/overlayAnimation";
import { MiniGameOverlay } from "../components/game-ui/MiniGameOverlay";
import { DebugPanel } from "../components/game-ui/DebugPanel";
import { loadMiniGameDefinition } from "../minigames/core/loadDefinition";

export function App() {
  const hydrated = useGameStore((state) => state.hydrated);
  const hydrate = useGameStore((state) => state.hydrate);
  const tutorialComplete = useGameStore((state) => state.tutorialComplete);
  const profile = useGameStore((state) => state.profile);
  const needs = useGameStore((state) => state.needs);
  const coins = useGameStore((state) => state.coins);
  const xp = useGameStore((state) => state.xp);
  const level = useGameStore((state) => state.level);
  const currentRoom = useGameStore((state) => state.currentRoom);
  const roomTheme = useGameStore((state) => state.roomTheme);
  const equipped = useGameStore((state) => state.equipped);
  const settings = useGameStore((state) => state.settings);
  const notifications = useGameStore((state) => state.notifications);
  const activeMiniGame = useGameStore((state) => state.activeMiniGame);
  const toast = useGameStore((state) => state.toast);
  const recoveryMessage = useGameStore((state) => state.recoveryMessage);
  const recoveryBackup = useGameStore((state) => state.recoveryBackup);
  const setRoom = useGameStore((state) => state.setRoom);
  const setOverlay = useGameStore((state) => state.setOverlay);
  const setActiveMiniGame = useGameStore((state) => state.setActiveMiniGame);
  const completeMiniGame = useGameStore((state) => state.completeMiniGame);
  const care = useGameStore((state) => state.care);
  const clearToast = useGameStore((state) => state.clearToast);
  const resetGame = useGameStore((state) => state.resetGame);
  const [bathProgress, setBathProgress] = useState(0);
  const [pendingResult, setPendingResult] = useState<MiniGameResult | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const updateServiceWorker = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const debug = new URLSearchParams(window.location.search).get("debug") === "1";

  useEffect(() => { if (!useGameStore.getState().hydrated) void hydrate(); }, [hydrate]);
  useEffect(() => {
    const update = registerSW({ onNeedRefresh: () => setUpdateReady(true) });
    updateServiceWorker.current = update;
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, 2400);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  const handleBathComplete = useCallback(() => {
    care("wash");
    gameBridge.emit("keeper:react", { action: "wash" });
    setBathProgress(0);
  }, [care]);
  const handleBathProgress = useCallback((progress: number) => setBathProgress(progress), []);
  const handleMiniGameFinish = useCallback((result: MiniGameResult) => setPendingResult(result), []);

  const startGame = async (id: MiniGameResult["gameId"]) => {
    const definition = await loadMiniGameDefinition(id);
    if (level < definition.requiredLevel) return;
    setPendingResult(null);
    setActiveMiniGame(id);
  };

  const claimReward = (result: MiniGameResult) => {
    completeMiniGame(result);
    gameBridge.emit("keeper:react", { action: result.success ? "play" : "wellness" });
    setPendingResult(null);
    setRoom("game-room");
  };

  const changeRoom = (room: RoomId) => {
    setRoom(room);
    setBathProgress(0);
  };

  if (!hydrated) return <main className="loading-screen"><div className="loading-orbit" /><p>해안 연구소를 여는 중...</p></main>;
  if (!tutorialComplete) return <Onboarding />;

  return (
    <div className={`app-background theme-${roomTheme} ${settings.reducedMotion ? "reduced-motion" : ""}`}>
      <div className="wide-ocean" aria-hidden="true"><i /><i /><i /></div>
      <main className="game-shell" data-testid="game-shell">
        <StatusBar needs={needs} coins={coins} xp={xp} level={level} onDaily={() => setOverlay("daily")} onNotifications={() => setOverlay("notifications")} />
        <section className="game-stage">
          <div className="room-heading"><div><p>{profile.name}</p><h1>{roomTitle(currentRoom)}</h1></div><span className="live-condition"><i />{conditionMessage(needs)}</span></div>
          <GameCanvas room={currentRoom} theme={roomTheme} equipped={equipped} skinTone={profile.skinTone} hairColor={profile.hairColor} reducedMotion={settings.reducedMotion} activeMiniGame={activeMiniGame} onMiniGameFinish={handleMiniGameFinish} onBathComplete={handleBathComplete} onBathProgress={handleBathProgress} />
          {!activeMiniGame && <RoomActionPanel room={currentRoom} bathProgress={bathProgress} onStartGame={(id) => void startGame(id)} />}
          {activeMiniGame && <MiniGameOverlay id={activeMiniGame} result={pendingResult} debug={debug} onClaim={claimReward} onExit={() => { setPendingResult(null); setActiveMiniGame(null); setRoom("game-room"); }} />}
        </section>
        <AppMenu onOpen={(overlay) => { setOverlay(overlay); animateKeeperForOverlay(overlay); }} />
        <RoomNav current={currentRoom} onChange={changeRoom} />
      </main>
      <OverlayHost />
      {debug && <DebugPanel />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {updateReady && <div className="update-banner" role="status"><span><strong>새 해류 지도가 도착했어요.</strong>안전하게 업데이트할 수 있습니다.</span><button onClick={() => void updateServiceWorker.current?.(true)}>업데이트</button></div>}
      {notifications.length > 0 && <button className="floating-signal" onClick={() => setOverlay("notifications")} aria-label={`새 알림 ${notifications.length}개`}>{Math.min(notifications.length, 9)}</button>}
      {recoveryMessage && <div className="recovery-dialog" role="alertdialog" aria-modal="true"><h2>저장 데이터 복구 안내</h2><p>{recoveryMessage}</p><div>{recoveryBackup && <button onClick={() => downloadText(recoveryBackup, "diha-corrupt-backup.json")}>손상 데이터 백업</button>}<button className="danger-button" onClick={() => void resetGame()}>새 게임 시작</button></div></div>}
    </div>
  );
}

function roomTitle(room: RoomId): string {
  return { studio: "햇살 스튜디오", kitchen: "타이드 주방", bathroom: "버블 베이", bedroom: "문 캐빈", wellness: "웰니스 랩", "game-room": "커런트 아케이드", wardrobe: "Keeper 옷장", shop: "코스트 상점" }[room];
}

function conditionMessage(needs: { satiety: number; hygiene: number; energy: number; joy: number; condition: number }): string {
  if (needs.energy < 40) return "오늘은 에너지가 조금 부족해.";
  if (needs.satiety < 40) return "배가 조금 고픈 것 같아.";
  if (needs.hygiene < 40) return "씻으면 기분이 좋아질 것 같아.";
  if (needs.joy < 40) return "간단히 쉬고 다시 시작해볼까?";
  return "오늘의 파도는 편안해 보여.";
}

function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
