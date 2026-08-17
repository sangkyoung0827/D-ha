import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    const bubble = this.add.graphics().fillStyle(0xd9ffff, 0.75).fillCircle(8, 8, 8);
    bubble.generateTexture("bubble", 16, 16).destroy();
    const sparkle = this.add.graphics().fillStyle(0xfff4b0).fillCircle(4, 4, 4);
    sparkle.generateTexture("sparkle", 8, 8).destroy();
    this.scene.start("room");
  }
}
