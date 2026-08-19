import Phaser from "phaser";

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 700;

export function getRenderScale(): number {
  return 2;
}

export function applyHighDpiCamera(scene: Phaser.Scene): number {
  const scale = Number(scene.registry.get("render-scale")) || getRenderScale();
  scene.cameras.main
    .setViewport(0, 0, GAME_WIDTH * scale, GAME_HEIGHT * scale)
    .setZoom(scale)
    .centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  scene.cameras.main.roundPixels = false;
  return scale;
}
