import Phaser from "phaser";
import { useEffect, useRef } from "react";
import { appearanceDescription } from "../domain/appearance";
import type { CharacterAppearance, MiniGameResult, RoomId, WearableSlot } from "../domain/types";
import { gameBridge } from "./bridge/GameBridge";
import { GAME_HEIGHT, GAME_WIDTH, getRenderScale } from "./renderQuality";
import { BootScene } from "./scenes/BootScene";
import { RoomScene } from "./scenes/RoomScene";
import type { OceanMode, OceanZoneId } from "../domain/ocean";

interface GameCanvasProps {
  room: RoomId;
  theme: string;
  equipped: Record<WearableSlot, string | null>;
  appearance: CharacterAppearance;
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
    const renderScale = getRenderScale();
    const initialPresentation = presentationRef.current;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: GAME_WIDTH * renderScale,
      height: GAME_HEIGHT * renderScale,
      parent: hostRef.current,
      transparent: true,
      scene: [BootScene, RoomScene],
      render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false, powerPreference: "high-performance" },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_WIDTH * renderScale, height: GAME_HEIGHT * renderScale, autoRound: false },
      input: { activePointers: 2 },
      callbacks: {
        preBoot(bootingGame) {
          bootingGame.registry.set("render-scale", renderScale);
          bootingGame.registry.set("initial-presentation", initialPresentation);
        }
      }
    });
    gameRef.current = game;
    return () => {
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
    gameBridge.emit("keeper:style", {
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

  return <div ref={hostRef} className="phaser-host" aria-label={`디하 게임 화면: ${appearanceDescription(props.appearance)}`} />;
}
