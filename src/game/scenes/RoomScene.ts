import Phaser from "phaser";
import type { RoomId, WearableSlot } from "../../domain/types";
import { gameBridge } from "../bridge/GameBridge";
import { Keeper } from "../entities/Keeper";

export class RoomScene extends Phaser.Scene {
  private room: RoomId = "studio";
  private theme = "sunlab";
  private background?: Phaser.GameObjects.Graphics;
  private keeper?: Keeper;
  private bathDistance = 0;
  private lastPointer?: Phaser.Math.Vector2;
  private cleanups: Array<() => void> = [];
  private style: { equipped: Record<WearableSlot, string | null>; skinTone: string; hairColor: string } = {
    equipped: { top: "top-rookie", bottom: "bottom-sand", shoes: "shoes-deck", accessory: null },
    skinTone: "sand",
    hairColor: "midnight"
  };

  constructor() {
    super("room");
  }

  create(): void {
    this.background = this.add.graphics();
    this.keeper = new Keeper(this, 195, 405, this.style).setDepth(3);
    this.drawRoom();

    this.cleanups = [
      gameBridge.on("room:change", ({ room, theme }) => {
        this.room = room;
        this.theme = theme;
        this.bathDistance = 0;
        this.drawRoom();
      }),
      gameBridge.on("keeper:style", (style) => {
        this.style = style;
        this.keeper?.updateStyle(style);
      }),
      gameBridge.on("keeper:react", ({ action }) => {
        this.keeper?.react(action);
        if (action === "wash") this.bubbleBurst();
        if (action === "level") this.sparkleBurst();
      }),
      gameBridge.on("settings:motion", ({ reduced }) => this.keeper?.setReducedMotion(reduced))
    ];

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.lastPointer = new Phaser.Math.Vector2(pointer.x, pointer.y);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.trackBath(pointer));
    this.input.on("pointerup", () => {
      this.lastPointer = undefined;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private trackBath(pointer: Phaser.Input.Pointer): void {
    if (this.room !== "bathroom" || !pointer.isDown || !this.lastPointer) return;
    const distance = Phaser.Math.Distance.Between(this.lastPointer.x, this.lastPointer.y, pointer.x, pointer.y);
    this.lastPointer.set(pointer.x, pointer.y);
    if (pointer.y < 190 || pointer.y > 570) return;
    this.bathDistance = Math.min(100, this.bathDistance + distance / 3.2);
    if (Math.random() > 0.55) this.addBubble(pointer.x, pointer.y);
    gameBridge.emit("bath:progress", { progress: Math.round(this.bathDistance) });
    if (this.bathDistance >= 100) {
      this.bathDistance = 0;
      gameBridge.emit("bath:complete", undefined);
      this.bubbleBurst();
    }
  }

  private drawRoom(): void {
    if (!this.background) return;
    const g = this.background.clear();
    if (this.room === "studio") this.drawHome(g);
    else if (this.room === "kitchen") this.drawKitchen(g);
    else if (this.room === "wellness") this.drawOcean(g);
    else if (this.room === "bathroom") this.drawBathroom(g);
    else if (this.room === "bedroom") this.drawBedroom(g);
    else if (this.room === "wardrobe") this.drawCloset(g);
    else if (this.room === "game-room") this.drawWorkout(g);
    else this.drawKitchen(g);
    this.placeKeeper();
  }

  private drawHome(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0xf7f3e8, 0xf7f3e8, 0xeadfc5, 0xeadfc5, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xdcc79e).fillRect(0, 500, 390, 200);
    g.fillStyle(0x167f9b).fillCircle(195, 202, 132);
    g.fillStyle(0x87d8d5).fillRect(65, 180, 260, 112);
    g.fillStyle(0xd5f4ec, 0.55).fillEllipse(195, 190, 270, 80);
    g.fillStyle(0xffd883).fillCircle(275, 132, 25);
    g.fillStyle(0x2f6871, 0.72).fillEllipse(125, 238, 76, 23).fillEllipse(162, 234, 46, 17);
    g.lineStyle(6, 0xfffdf3, 1).strokeCircle(195, 202, 136);
    g.lineStyle(2, 0xffffff, 0.48).beginPath().moveTo(76, 238).lineTo(128, 228).lineTo(190, 242).lineTo(252, 253).lineTo(316, 235).strokePath();
    g.fillStyle(this.themeAccent(), 0.32).fillEllipse(195, 560, 250, 82);
    g.fillStyle(0xf8f0d8).fillRoundedRect(18, 394, 72, 120, 18);
    g.fillStyle(0x6db9a4).fillCircle(54, 392, 26).fillCircle(35, 407, 18).fillCircle(70, 414, 19);
    g.fillStyle(0x8a725a).fillRoundedRect(330, 386, 16, 126, 8);
    g.fillStyle(0xffd78a).fillCircle(338, 378, 28);
  }

  private drawKitchen(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0xe5f4ef, 0xe5f4ef, 0xf8edda, 0xf8edda, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xe4cfab).fillRect(0, 506, 390, 194);
    g.lineStyle(1, 0xffffff, 0.62);
    for (let x = 0; x <= 390; x += 39) g.lineBetween(x, 116, x, 310);
    for (let y = 116; y <= 310; y += 38) g.lineBetween(0, y, 390, y);
    g.fillStyle(0xb9ddd5).fillRoundedRect(18, 94, 94, 248, 18);
    g.lineStyle(2, 0x7ca9a3, 0.6).lineBetween(18, 210, 112, 210);
    g.fillStyle(0x6c9793).fillRoundedRect(90, 148, 5, 35, 3).fillRoundedRect(90, 250, 5, 35, 3);
    g.fillStyle(0xfaf8ef).fillRoundedRect(128, 262, 244, 82, 15);
    g.fillStyle(0x79bdb5).fillRect(125, 300, 250, 18).fillRoundedRect(137, 318, 104, 104, 12).fillRoundedRect(251, 318, 112, 104, 12);
    g.fillStyle(0x819c9a).fillEllipse(200, 301, 78, 13);
    g.lineStyle(5, 0x819c9a).beginPath().moveTo(196, 278).lineTo(196, 257).lineTo(217, 251).lineTo(217, 278).strokePath();
    g.fillStyle(0xf7f4e8).fillRoundedRect(142, 134, 205, 16, 8);
    g.fillStyle(0xefaa76).fillRoundedRect(164, 91, 20, 42, 7);
    g.fillStyle(0x67b6ad).fillRoundedRect(205, 101, 18, 32, 6);
    g.fillStyle(0xf3cf76).fillCircle(252, 119, 13);
    g.lineStyle(4, 0x7f9b96).strokeCircle(300, 112, 22).strokeCircle(300, 112, 14);
    g.fillStyle(this.themeAccent(), 0.34).fillEllipse(242, 553, 208, 64);
    g.fillStyle(0xf9edd0).fillRoundedRect(252, 430, 124, 69, 20);
    g.fillStyle(0xc69668).fillRoundedRect(269, 492, 13, 65, 7).fillRoundedRect(346, 492, 13, 65, 7);
    g.fillStyle(0xffffff, 0.8).fillCircle(290, 455, 15);
    g.fillStyle(0xeda976).fillCircle(333, 455, 9).fillCircle(348, 453, 7);
  }

  private drawOcean(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0x8ce3dc, 0x8ce3dc, 0x126b89, 0x0c5475, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xffffff, 0.12).fillTriangle(34, 0, 100, 0, 160, 520).fillTriangle(186, 0, 230, 0, 272, 480).fillTriangle(314, 0, 354, 0, 342, 430);
    g.fillStyle(0xe9d49b).fillRect(0, 548, 390, 152);
    g.fillStyle(0xf2e0ae).fillEllipse(105, 548, 230, 55).fillEllipse(310, 558, 230, 68);
    g.fillStyle(0x527b75).fillEllipse(46, 555, 76, 50).fillEllipse(349, 582, 96, 69).fillEllipse(282, 556, 52, 38);
    g.lineStyle(7, 0x3a9d78).beginPath().moveTo(75, 615).lineTo(58, 574).lineTo(72, 526).moveTo(86, 617).lineTo(104, 566).lineTo(92, 520).moveTo(323, 626).lineTo(306, 578).lineTo(319, 532).strokePath();
    g.lineStyle(6, 0xe7846e).beginPath().moveTo(137, 624).lineTo(137, 568).moveTo(137, 585).lineTo(116, 562).moveTo(138, 593).lineTo(160, 566).moveTo(138, 578).lineTo(146, 548).strokePath();
    this.drawFish(g, 78, 242, 0xf4c66e, 1);
    this.drawFish(g, 276, 310, 0xef9c84, -1);
    this.drawFish(g, 208, 182, 0xeaf7d8, 1);
    [52, 122, 240, 326].forEach((x, index) => {
      g.lineStyle(2, 0xffffff, 0.48).strokeCircle(x, 385 - index * 42, 5 + index).strokeCircle(x + 12, 418 - index * 45, 3 + index / 2);
    });
  }

  private drawBathroom(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe8f5f1).fillRect(0, 0, 390, 700);
    g.lineStyle(1, 0xc5dedb, 0.8);
    for (let x = 0; x <= 390; x += 52) g.lineBetween(x, 70, x, 510);
    for (let y = 70; y <= 510; y += 52) g.lineBetween(0, y, 390, y);
    g.fillStyle(0xd7c5a3).fillRect(0, 510, 390, 190);
    g.fillStyle(0xb8e5e2, 0.48).fillRoundedRect(16, 82, 150, 376, 26);
    g.lineStyle(5, 0x74b4b4).lineBetween(43, 112, 43, 395).beginPath().moveTo(42, 118).lineTo(68, 105).lineTo(92, 128).strokePath();
    g.lineStyle(3, 0x74b4b4).strokeCircle(96, 138, 25);
    for (let index = 0; index < 5; index += 1) g.lineBetween(78 + index * 9, 164, 70 + index * 10, 194);
    g.fillStyle(0x8accca).fillRoundedRect(18, 430, 150, 36, 16);
    g.fillStyle(0xc8e9e4).fillRoundedRect(213, 92, 132, 148, 28);
    g.lineStyle(7, 0xffffff, 0.72).strokeRoundedRect(213, 92, 132, 148, 28);
    g.fillStyle(0xf8f5eb).fillRoundedRect(211, 280, 151, 17, 8);
    g.fillStyle(0xeda97d).fillRoundedRect(236, 247, 18, 33, 6);
    g.fillStyle(0x67beb3).fillRoundedRect(268, 255, 17, 25, 6);
    g.fillStyle(0xf1ce77).fillRoundedRect(302, 250, 20, 30, 7);
    g.fillStyle(0xf7f5eb).fillRoundedRect(274, 385, 90, 104, 30);
    g.fillStyle(0xd9e7e3).fillEllipse(319, 386, 92, 38);
    g.fillStyle(this.themeAccent(), 0.3).fillEllipse(210, 558, 228, 64);
  }

  private drawBedroom(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0x142d4e, 0x142d4e, 0x243d63, 0x243d63, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0x172943).fillRect(0, 510, 390, 190);
    g.fillStyle(0x274d70).fillRoundedRect(226, 78, 130, 176, 30);
    g.fillStyle(0xffefb7).fillCircle(303, 142, 37);
    g.fillStyle(0x274d70).fillCircle(318, 130, 35);
    g.lineStyle(6, 0x577391).strokeRoundedRect(226, 78, 130, 176, 30);
    [[48,116],[106,88],[165,150],[201,102],[367,72],[82,232],[179,62]].forEach(([x,y], index) => g.fillStyle(index % 2 ? 0xa9d8e0 : 0xffedaf, 0.75).fillCircle(x!, y!, index % 3 + 2));
    g.fillStyle(0x435f83).fillRoundedRect(30, 402, 330, 148, 28);
    g.fillStyle(0xdce7ef).fillRoundedRect(47, 386, 102, 62, 24);
    g.fillStyle(0x7694b9).fillRoundedRect(48, 435, 294, 102, 26);
    g.fillStyle(0x91aecb, 0.72).fillRoundedRect(190, 442, 152, 95, 25);
    g.fillStyle(0x183855).fillRoundedRect(18, 355, 62, 18, 9).fillRoundedRect(34, 371, 12, 75, 6);
    g.fillStyle(0xffd67f).fillCircle(49, 327, 31);
    g.fillStyle(0xffd67f, 0.15).fillCircle(49, 327, 63);
  }

  private drawCloset(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0xf6eee0, 0xf6eee0, 0xe8d6bc, 0xe8d6bc, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xd9bc91).fillRect(0, 512, 390, 188);
    g.fillStyle(0xe3ccb0).fillRoundedRect(18, 76, 140, 378, 24);
    g.fillStyle(0xf8f2e8).fillRoundedRect(31, 91, 114, 350, 18);
    g.lineStyle(3, 0xa88f74).lineBetween(88, 92, 88, 441);
    g.fillStyle(0x9d8269).fillCircle(76, 268, 4).fillCircle(100, 268, 4);
    g.lineStyle(8, 0x8a7462).lineBetween(188, 116, 355, 116);
    [0x58aaa7, 0xef9d85, 0x789ccc, 0xe7c069].forEach((color, index) => {
      const x = 211 + index * 40;
      g.lineStyle(2, 0x8a7462).beginPath().moveTo(x, 116).lineTo(x, 139).lineTo(x - 13, 151).moveTo(x, 139).lineTo(x + 13, 151).strokePath();
      g.fillStyle(color).fillRoundedRect(x - 17, 151, 34, 90 - index * 4, 10);
    });
    g.fillStyle(0xd8b98e).fillRoundedRect(184, 284, 180, 158, 20);
    g.lineStyle(2, 0xaf8f69, 0.7).lineBetween(184, 334, 364, 334).lineBetween(184, 386, 364, 386);
    g.fillStyle(0x6eb7ad).fillRoundedRect(205, 267, 55, 14, 6);
    g.fillStyle(0xefaa8d).fillRoundedRect(267, 270, 72, 11, 5);
    g.fillStyle(this.themeAccent(), 0.31).fillEllipse(204, 557, 244, 68);
  }

  private drawWorkout(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0xe8f0ed, 0xe8f0ed, 0xd6e2df, 0xd6e2df, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xa8b8b6).fillRect(0, 510, 390, 190);
    g.lineStyle(7, 0x465e64).lineBetween(34, 108, 34, 432).lineBetween(142, 108, 142, 432).lineBetween(34, 116, 142, 116).lineBetween(34, 222, 142, 222);
    [0x214957, 0x4b7f83, 0x214957].forEach((color, index) => {
      g.fillStyle(color).fillCircle(52 + index * 35, 384, 18 + index * 3);
      g.fillStyle(0xaad4cc).fillCircle(52 + index * 35, 384, 5);
    });
    g.fillStyle(0x294e5c).fillRoundedRect(242, 118, 104, 17, 8).fillRoundedRect(286, 134, 14, 236, 7);
    g.fillStyle(0x75bcb2).fillRoundedRect(244, 170, 100, 120, 26);
    g.fillStyle(0x294e5c).fillRoundedRect(220, 386, 147, 26, 12).fillRoundedRect(239, 408, 16, 70, 8).fillRoundedRect(335, 408, 16, 70, 8);
    g.fillStyle(0x48636b).fillRoundedRect(80, 450, 165, 23, 11).fillRoundedRect(99, 470, 14, 63, 7).fillRoundedRect(215, 470, 14, 63, 7);
    g.fillStyle(this.themeAccent(), 0.48).fillRoundedRect(72, 542, 246, 72, 28);
    this.drawDumbbell(g, 39, 553);
    this.drawDumbbell(g, 335, 554);
  }

  private drawFish(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, direction: 1 | -1): void {
    g.fillStyle(color).fillEllipse(x, y, 42, 23);
    g.fillTriangle(x - 18 * direction, y, x - 38 * direction, y - 15, x - 38 * direction, y + 15);
    g.fillStyle(0x173d48).fillCircle(x + 11 * direction, y - 3, 2);
  }

  private drawDumbbell(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.lineStyle(6, 0x314e55).lineBetween(x - 16, y, x + 16, y);
    g.fillStyle(0x314e55).fillRoundedRect(x - 24, y - 11, 8, 22, 4).fillRoundedRect(x + 16, y - 11, 8, 22, 4);
  }

  private placeKeeper(): void {
    if (!this.keeper) return;
    const placements: Record<RoomId, { x: number; y: number; scale: number; pose: "standing" | "sleeping" }> = {
      studio: { x: 195, y: 402, scale: 1.08, pose: "standing" },
      kitchen: { x: 202, y: 420, scale: 0.96, pose: "standing" },
      wellness: { x: 306, y: 440, scale: 0.6, pose: "standing" },
      bathroom: { x: 205, y: 416, scale: 0.92, pose: "standing" },
      bedroom: { x: 211, y: 458, scale: 0.72, pose: "sleeping" },
      wardrobe: { x: 194, y: 424, scale: 0.94, pose: "standing" },
      "game-room": { x: 188, y: 418, scale: 0.96, pose: "standing" },
      shop: { x: 202, y: 420, scale: 0.96, pose: "standing" }
    };
    const placement = placements[this.room];
    this.keeper.setRoomPresentation(placement.x, placement.y, placement.scale, placement.pose);
  }

  private themeAccent(): number {
    return { sunlab: 0x53c2b9, lagoon: 0x3aaeb3, coral: 0xe98978, midnight: 0x667fbd }[this.theme] ?? 0x53c2b9;
  }

  private addBubble(x: number, y: number): void {
    const bubble = this.add.image(x, y, "bubble").setScale(Phaser.Math.FloatBetween(0.6, 1.5)).setDepth(8);
    this.tweens.add({ targets: bubble, y: y - 70, alpha: 0, duration: 650, onComplete: () => bubble.destroy() });
  }

  private bubbleBurst(): void {
    for (let index = 0; index < 18; index += 1) {
      this.time.delayedCall(index * 24, () => this.addBubble(195 + Phaser.Math.Between(-85, 85), 420 + Phaser.Math.Between(-110, 70)));
    }
  }

  private sparkleBurst(): void {
    for (let index = 0; index < 18; index += 1) {
      const sparkle = this.add.image(195, 340, "sparkle").setDepth(9);
      const angle = (Math.PI * 2 * index) / 18;
      this.tweens.add({
        targets: sparkle,
        x: 195 + Math.cos(angle) * Phaser.Math.Between(70, 140),
        y: 340 + Math.sin(angle) * Phaser.Math.Between(70, 140),
        alpha: 0,
        duration: 700,
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.input.removeAllListeners();
  }
}
