import { lazy, Suspense, useCallback, useEffect, useState } from "react";
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
import { OceanHub } from "../components/game-ui/OceanHub";
import { isOceanGame, ownsOceanGear, type OceanMode, type OceanZoneId } from "../domain/ocean";
import { startPwaUpdate } from "../platform/pwa/update";
import { useAccount } from "../platform/auth/AccountProvider";
import { GoogleSignInScreen } from "../components/auth/GoogleSignInScreen";
import { isHomeInterior } from "../domain/home";

const Home3DCanvas = lazy(() => import("../components/game-ui/Home3DCanvas").then((module) => ({ default: module.Home3DCanvas })));

export function App() {
  const hydrated = useGameStore((state) => state.hydrated);
  const hydratedOwner = useGameStore((state) => state.hydratedOwner);
  const syncStatus = useGameStore((state) => state.syncStatus);
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
  const highScores = useGameStore((state) => state.highScores);
  const inventory = useGameStore((state) => state.inventory);
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
  const [oceanMode, setOceanMode] = useState<OceanMode>("exploration");
  const [oceanZone, setOceanZone] = useState<OceanZoneId>("beach");
  const { status: accountStatus, account } = useAccount();
  const debug = new URLSearchParams(window.location.search).get("debug") === "1";

  useEffect(() => {
    if (accountStatus === "loading" || syncStatus === "syncing") return;
    if (accountStatus === "signed-in" && account) {
      const owner = `user:${account.uid}`;
      if (hydratedOwner !== owner) void hydrate(account.uid);
      return;
    }
    if (hydratedOwner === null) void hydrate(null);
  }, [accountStatus, account, hydrate, hydratedOwner, syncStatus]);
  useEffect(() => startPwaUpdate(), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, 2400);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);
  useEffect(() => gameBridge.on("kitchen:fridge-open", () => setOverlay("fridge")), [setOverlay]);
  useEffect(() => gameBridge.on("home:door-enter", ({ room }) => {
    if (room === "wellness") {
      setOceanMode("exploration");
      setOceanZone("beach");
    }
    setBathProgress(0);
    setRoom(room);
  }), [setRoom]);

  const handleBathComplete = useCallback(() => {
    care("wash");
      gameBridge.emit("pet:react", { action: "wash" });
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
    gameBridge.emit("pet:react", { action: result.success ? "play" : "wellness" });
    setPendingResult(null);
    if (isOceanGame(result.gameId)) {
      setOceanZone("beach");
      setOceanMode("exploration");
      setRoom("wellness");
    } else {
      setRoom("game-room");
    }
  };

  const changeRoom = (room: RoomId) => {
    if (activeMiniGame) {
      setPendingResult(null);
      setActiveMiniGame(null);
    }
    setRoom(room);
    setBathProgress(0);
  };

  if (!hydrated || (accountStatus === "loading" && hydratedOwner === null)) return <main className="loading-screen"><div className="loading-orbit" /><p>디하를 깨우는 중...</p></main>;
  if (!tutorialComplete) return <Onboarding />;
  if (accountStatus !== "signed-in" || !account) return <GoogleSignInScreen profile={profile} returning />;
  if (hydratedOwner !== `user:${account.uid}`) return <main className="loading-screen"><div className="loading-orbit" /><p>계정 항해를 불러오는 중...</p></main>;

  return (
    <div className={`app-background theme-${roomTheme} ${settings.reducedMotion ? "reduced-motion" : ""}`}>
      <div className="wide-ocean" aria-hidden="true"><i /><i /><i /></div>
      <main className="game-shell" data-testid="game-shell">
        <StatusBar needs={needs} />
        <GameRoom room={currentRoom} petName={profile.name} immersive={Boolean(activeMiniGame)}>
          {!activeMiniGame && isHomeInterior(currentRoom)
            ? <Suspense fallback={<div className="home3d-loading" role="status">3D 집을 여는 중...</div>}><Home3DCanvas currentRoom={currentRoom} equipped={equipped} appearance={profile} reducedMotion={settings.reducedMotion} tired={needs.energy < 25} onRoomChange={(room) => {
                  if (room === "wellness") { setOceanMode("exploration"); setOceanZone("beach"); }
                  setBathProgress(0);
                  setRoom(room);
                }} /></Suspense>
            : <GameCanvas room={currentRoom} theme={roomTheme} equipped={equipped} appearance={profile} reducedMotion={settings.reducedMotion} oceanMode={oceanMode} oceanZone={oceanZone} oceanGear={ownsOceanGear(inventory)} activeMiniGame={activeMiniGame} onMiniGameFinish={handleMiniGameFinish} onBathComplete={handleBathComplete} onBathProgress={handleBathProgress} />}
          {!activeMiniGame && currentRoom === "studio" && <div className="home-control-hint"><span>☝</span><strong>3D 바닥을 눌러 걷기</strong><small>문을 누르면 열고 이동해요</small></div>}
          {!activeMiniGame && currentRoom !== "studio" && currentRoom !== "wellness" && <ContextTray room={currentRoom} bathProgress={bathProgress} />}
          {!activeMiniGame && currentRoom === "wellness" && <OceanHub mode={oceanMode} zone={oceanZone} highScores={highScores} oceanGear={ownsOceanGear(inventory)} onModeChange={setOceanMode} onZoneChange={setOceanZone} onStartGame={(id) => void startGame(id)} onOpenShop={() => setOverlay("shop")} />}
          {activeMiniGame && <MiniGameOverlay id={activeMiniGame} result={pendingResult} debug={debug} onClaim={claimReward} onExit={() => { const returnRoom = isOceanGame(activeMiniGame) ? "wellness" : "game-room"; setPendingResult(null); setActiveMiniGame(null); setRoom(returnRoom); }} />}
        </GameRoom>
        <RoomNav current={currentRoom} onChange={changeRoom} />
      </main>
      <OverlayHost />
      {debug && <DebugPanel />}
      {toast && <div className="toast" role="status">{toast}</div>}
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
