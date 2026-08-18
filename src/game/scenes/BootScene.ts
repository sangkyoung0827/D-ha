import Phaser from "phaser";
import { getRenderScale } from "../renderQuality";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    this.load.image("ocean-beach-photoreal", "/assets/ocean-beach-photoreal-v1.jpg");
    this.load.image("kitchen-photoreal", "/assets/kitchen-photoreal-v1.jpg");
    this.load.image("bathroom-photoreal", "/assets/bathroom-photoreal-v1.jpg");
    this.load.image("bedroom-photoreal", "/assets/bedroom-photoreal-v1.jpg");
    this.load.image("wardrobe-photoreal", "/assets/wardrobe-photoreal-v1.jpg");
    this.load.image("workout-photoreal", "/assets/workout-photoreal-v1.jpg");
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
