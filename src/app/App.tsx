import { useCallback, useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { GameCanvas } from "../game/GameCanvas";
import { gameBridge } from "../game/bridge/GameBridge";
import type { MiniGameResult, RoomId } from "../domain/types";
import { useGameStore } from "../store/gameStore";
import { Onboarding } from "../components/onboarding/Onboarding";
import { StatusBar } from "../components/game-ui/StatusBar";
import { RoomNav } from "../components/game-ui/RoomNav";
import { ContextTray } from "../components/game-ui/ContextTray";
import { OverlayHost } from "../components/game-ui/OverlayHost";
import { MiniGameOverlay } from "../components/game-ui/MiniGameOverlay";
import { DebugPanel } from "../components/game-ui/DebugPanel";
import { loadMiniGameDefinition } from "../minigames/core/loadDefinition";
import { GameRoom } from "../components/game-ui/GameRoom";

export function App() {
  const hydrated = useGameStore((state) => state.hydrated);
  const hydrate = useGameStore((state) => state.hydrate);
  const tutorialComplete = useGameStore((state) => state.tutorialComplete);
  const profile = useGameStore((state) => state.profile);
  const needs = useGameStore((state) => state.needs);
  const level = useGameStore((state) => state.level);
  const currentRoom = useGameStore((state) => state.currentRoom);
  const roomTheme = useGameStore((state) => state.roomTheme);
  const equipped = useGameStore((state) => state.equipped);
  const settings = useGameStore((state) => state.settings);
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
        <StatusBar needs={needs} level={level} onDaily={() => setOverlay("daily")} onNotifications={() => setOverlay("notifications")} onSettings={() => setOverlay("settings")} />
        <GameRoom room={currentRoom} keeperName={profile.name}>
          <GameCanvas room={currentRoom} theme={roomTheme} equipped={equipped} skinTone={profile.skinTone} hairColor={profile.hairColor} reducedMotion={settings.reducedMotion} activeMiniGame={activeMiniGame} onMiniGameFinish={handleMiniGameFinish} onBathComplete={handleBathComplete} onBathProgress={handleBathProgress} />
          {!activeMiniGame && <ContextTray room={currentRoom} bathProgress={bathProgress} onStartGame={(id) => void startGame(id)} />}
          {activeMiniGame && <MiniGameOverlay id={activeMiniGame} result={pendingResult} debug={debug} onClaim={claimReward} onExit={() => { setPendingResult(null); setActiveMiniGame(null); setRoom("game-room"); }} />}
        </GameRoom>
        <RoomNav current={currentRoom} onChange={changeRoom} />
      </main>
      <OverlayHost />
      {debug && <DebugPanel />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {updateReady && <div className="update-banner" role="status"><span><strong>새 해류 지도가 도착했어요.</strong>안전하게 업데이트할 수 있습니다.</span><button onClick={() => void updateServiceWorker.current?.(true)}>업데이트</button></div>}
      {recoveryMessage && <div className="recovery-dialog" role="alertdialog" aria-modal="true"><h2>저장 데이터 복구 안내</h2><p>{recoveryMessage}</p><div>{recoveryBackup && <button onClick={() => downloadText(recoveryBackup, "diha-corrupt-backup.json")}>손상 데이터 백업</button>}<button className="danger-button" onClick={() => void resetGame()}>새 게임 시작</button></div></div>}
    </div>
  );
}

function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
