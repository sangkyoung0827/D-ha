import Phaser from "phaser";
import { useEffect, useRef } from "react";
import { petDescription, type PetAppearance } from "../domain/pet";
import type { MiniGameResult, RoomId, WearableSlot } from "../domain/types";
import { gameBridge } from "./bridge/GameBridge";
import { GAME_HEIGHT, GAME_WIDTH, applyHighDpiCamera, getRenderScale } from "./renderQuality";
import { BootScene } from "./scenes/BootScene";
import { RoomScene } from "./scenes/RoomScene";
import type { OceanMode, OceanZoneId } from "../domain/ocean";

interface GameCanvasProps {
  room: RoomId;
  theme: string;
  equipped: Record<WearableSlot, string | null>;
  appearance: PetAppearance;
  reducedMotion: boolean;
  oceanMode: OceanMode;
  oceanZone: OceanZoneId;
  activeMiniGame: MiniGameResult["gameId"] | null;
  onMiniGameFinish(result: MiniGameResult): void;
  onBathComplete(): void;
  onBathProgress(progress: number): void;
}

export function GameCanvas(props: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const presentationRef = useRef({
    room: props.room,
    theme: props.theme,
    style: { equipped: props.equipped, ...props.appearance },
    reducedMotion: props.reducedMotion,
    oceanMode: props.oceanMode,
    oceanZone: props.oceanZone
  });
  const { onBathComplete, onBathProgress, onMiniGameFinish } = props;

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    const host = hostRef.current;
    const renderScale = getRenderScale();
    const viewportWidth = Math.max(1, host.clientWidth || GAME_WIDTH);
    const viewportHeight = Math.max(1, host.clientHeight || GAME_HEIGHT);
    const pixelWidth = Math.round(viewportWidth * renderScale);
    const pixelHeight = Math.round(viewportHeight * renderScale);
    const initialPresentation = presentationRef.current;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: pixelWidth,
      height: pixelHeight,
      parent: host,
      transparent: true,
      scene: [BootScene, RoomScene],
      render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false, powerPreference: "high-performance" },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: pixelWidth, height: pixelHeight, autoRound: false },
      input: { activePointers: 2 },
      callbacks: {
        preBoot(bootingGame) {
          bootingGame.registry.set("render-scale", renderScale);
          bootingGame.registry.set("viewport-width", viewportWidth);
          bootingGame.registry.set("viewport-height", viewportHeight);
          bootingGame.registry.set("initial-presentation", initialPresentation);
        }
      }
    });
    gameRef.current = game;

    let resizeFrame = 0;
    let previousWidth = viewportWidth;
    let previousHeight = viewportHeight;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const nextWidth = Math.max(1, host.clientWidth || GAME_WIDTH);
        const nextHeight = Math.max(1, host.clientHeight || GAME_HEIGHT);
        if (Math.abs(nextWidth - previousWidth) < 1 && Math.abs(nextHeight - previousHeight) < 1) return;
        previousWidth = nextWidth;
        previousHeight = nextHeight;
        const nextScale = getRenderScale();
        game.registry.set("render-scale", nextScale);
        game.registry.set("viewport-width", nextWidth);
        game.registry.set("viewport-height", nextHeight);
        game.scale.setGameSize(Math.round(nextWidth * nextScale), Math.round(nextHeight * nextScale));
        for (const scene of game.scene.getScenes(true)) applyHighDpiCamera(scene);
      });
    });
    resizeObserver.observe(host);
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeFrame);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    gameRef.current?.registry.set("initial-presentation", {
      room: props.room,
      theme: props.theme,
      style: { equipped: props.equipped, ...props.appearance },
      reducedMotion: props.reducedMotion,
      oceanMode: props.oceanMode,
      oceanZone: props.oceanZone
    });
  }, [props.room, props.theme, props.equipped, props.appearance, props.reducedMotion, props.oceanMode, props.oceanZone]);

  useEffect(() => {
    gameBridge.emit("room:change", { room: props.room, theme: props.theme });
  }, [props.room, props.theme]);

  useEffect(() => {
    gameBridge.emit("pet:style", {
      equipped: props.equipped,
      ...props.appearance
    });
  }, [props.equipped, props.appearance]);

  useEffect(() => {
    gameBridge.emit("settings:motion", { reduced: props.reducedMotion });
  }, [props.reducedMotion]);

  useEffect(() => {
    gameBridge.emit("ocean:view", { mode: props.oceanMode, zone: props.oceanZone });
  }, [props.oceanMode, props.oceanZone]);

  useEffect(() => {
    const finish = gameBridge.on("minigame:finish", onMiniGameFinish);
    const bathComplete = gameBridge.on("bath:complete", onBathComplete);
    const bathProgress = gameBridge.on("bath:progress", ({ progress }) => onBathProgress(progress));
    return () => {
      finish();
      bathComplete();
      bathProgress();
    };
  }, [onBathComplete, onBathProgress, onMiniGameFinish]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (!props.activeMiniGame) {
      if (game.scene.isActive("minigame") || game.scene.isPaused("minigame")) game.scene.stop("minigame");
      if (game.scene.keys.room && !game.scene.isActive("room")) game.scene.start("room");
      return;
    }
    let cancelled = false;
    void import("./scenes/MiniGameScene").then(({ MiniGameScene }) => {
      if (cancelled || !gameRef.current) return;
      if (!game.scene.keys.minigame) game.scene.add("minigame", MiniGameScene, false);
      if (game.scene.isActive("room")) game.scene.sleep("room");
      game.scene.start("minigame", { id: props.activeMiniGame });
    });
    return () => {
      cancelled = true;
    };
  }, [props.activeMiniGame]);

  return <div ref={hostRef} className="phaser-host" aria-label={`디하 반려동물 게임 화면: ${petDescription(props.appearance)}`} />;
}
