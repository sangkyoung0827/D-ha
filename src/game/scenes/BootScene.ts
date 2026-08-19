import Phaser from "phaser";
import { getRenderScale } from "../renderQuality";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    this.load.image("ocean-beach-game", "/assets/ocean-beach-game-v2.jpg");
    this.load.image("kitchen-game", "/assets/kitchen-game-v2.jpg");
    this.load.image("bathroom-game", "/assets/bathroom-game-v2.jpg");
    this.load.image("bedroom-game", "/assets/bedroom-game-v2.jpg");
    this.load.image("wardrobe-game", "/assets/wardrobe-game-v2.jpg");
    this.load.image("workout-game", "/assets/workout-game-v2.jpg");
    this.load.image("ocean-run-beach", "/assets/ocean-run-beach-v1.jpg");
    this.load.image("ocean-run-surf", "/assets/ocean-run-surf-v1.jpg");
    this.load.image("ocean-run-cave", "/assets/ocean-run-cave-v1.jpg");
    this.load.image("ocean-run-deepsea", "/assets/ocean-run-deepsea-v1.jpg");
    this.load.image("ocean-run-surfboard", "/assets/ocean-run-surfboard-v1.png");
    this.load.image("ocean-run-palm", "/assets/ocean-run-palm-v1.png");
    this.load.image("ocean-run-driftwood", "/assets/ocean-run-driftwood-v1.png");
  }

  create(): void {
    const renderScale = getRenderScale();
    const bubble = this.add.graphics().fillStyle(0xd9ffff, 0.75).fillCircle(8 * renderScale, 8 * renderScale, 8 * renderScale);
    bubble.generateTexture("bubble", 16 * renderScale, 16 * renderScale).destroy();
    const sparkle = this.add.graphics().fillStyle(0xfff4b0).fillCircle(4 * renderScale, 4 * renderScale, 4 * renderScale);
    sparkle.generateTexture("sparkle", 8 * renderScale, 8 * renderScale).destroy();
    this.registry.set("particle-display-scale", 1 / renderScale);
    this.scene.start("room");
  }
}
