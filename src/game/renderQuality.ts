import Phaser from "phaser";

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 700;

export function getRenderScale(): number {
  if (typeof window === "undefined") return 2;
  return Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
}

export function applyHighDpiCamera(scene: Phaser.Scene): number {
  const scale = Number(scene.registry.get("render-scale")) || getRenderScale();
  const viewportWidth = Number(scene.registry.get("viewport-width")) || GAME_WIDTH;
  const viewportHeight = Number(scene.registry.get("viewport-height")) || GAME_HEIGHT;
  const pixelWidth = Math.max(1, Math.round(viewportWidth * scale));
  const pixelHeight = Math.max(1, Math.round(viewportHeight * scale));
  const coverScale = Math.max(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);
  scene.cameras.main
    .setViewport(0, 0, pixelWidth, pixelHeight)
    .setZoom(coverScale * scale)
    .centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  scene.cameras.main.roundPixels = false;
  return scale;
}
