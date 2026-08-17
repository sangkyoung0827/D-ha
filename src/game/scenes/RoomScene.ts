import Phaser from "phaser";
import type { RoomId, WearableSlot } from "../../domain/types";
import { gameBridge } from "../bridge/GameBridge";
import { Keeper } from "../entities/Keeper";

const ROOM_LABELS: Record<RoomId, string> = {
  studio: "SUNLIT STUDIO",
  kitchen: "TIDE KITCHEN",
  bathroom: "BUBBLE BAY",
  bedroom: "MOON CABIN",
  wellness: "WELLNESS LAB",
  "game-room": "CURRENT ARCADE",
  wardrobe: "KEEPER WARDROBE",
  shop: "COAST SUPPLY"
};

export class RoomScene extends Phaser.Scene {
  private room: RoomId = "studio";
  private theme = "sunlab";
  private background?: Phaser.GameObjects.Graphics;
  private keeper?: Keeper;
  private title?: Phaser.GameObjects.Text;
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
    this.title = this.add
      .text(20, 22, ROOM_LABELS[this.room], {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#174b57",
        letterSpacing: 2
      })
      .setDepth(5);
    this.keeper = new Keeper(this, 195, 405, this.style).setDepth(3);
    this.drawRoom();

    this.cleanups = [
      gameBridge.on("room:change", ({ room, theme }) => {
        this.room = room;
        this.theme = theme;
        this.bathDistance = 0;
        this.title?.setText(ROOM_LABELS[room]);
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
    if (pointer.y < 230 || pointer.y > 590) return;
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
    const palette = this.palette();
    const g = this.background.clear();
    g.fillGradientStyle(palette.sky, palette.sky, palette.floor, palette.floor, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(palette.floor).fillRect(0, 520, 390, 180);
    g.lineStyle(3, 0xffffff, 0.4).lineBetween(0, 520, 390, 520);
    this.children.list
      .filter((child) => child.getData?.("room-prop") === true)
      .forEach((child) => child.destroy());

    if (this.room === "studio") this.drawStudio(g);
    if (this.room === "kitchen") this.drawKitchen(g);
    if (this.room === "bathroom") this.drawBathroom(g);
    if (this.room === "bedroom") this.drawBedroom(g);
    if (this.room === "wellness") this.drawWellness(g);
    if (this.room === "game-room") this.drawGameRoom(g);
    if (this.room === "wardrobe") this.drawWardrobe(g);
    if (this.room === "shop") this.drawShop(g);
  }

  private drawStudio(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xcaf3ef, 0.8).fillRoundedRect(36, 85, 318, 170, 24);
    g.fillStyle(0x158aa0).fillRect(48, 98, 294, 140);
    g.fillStyle(0x84d6d2).fillEllipse(195, 230, 330, 80);
    g.fillStyle(0xffd77b).fillCircle(285, 132, 28);
    g.lineStyle(6, 0xfaf1d7, 1).strokeRoundedRect(36, 85, 318, 170, 24);
    g.fillStyle(0x204d63).fillRoundedRect(312, 350, 58, 170, 28);
    g.lineStyle(4, 0x56d9c7, 0.7).strokeCircle(341, 407, 19).strokeCircle(341, 459, 19);
    this.label("OCEAN GATE\nLOCKED", 341, 510, "#d9fff4");
  }

  private drawKitchen(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xf8f0d9).fillRoundedRect(20, 86, 350, 140, 20);
    g.fillStyle(0x53b8b0).fillRoundedRect(30, 96, 94, 120, 15).fillRoundedRect(266, 96, 94, 120, 15);
    g.fillStyle(0xffc76b).fillRoundedRect(14, 452, 150, 68, 18).fillRoundedRect(226, 452, 150, 68, 18);
    this.label("TOUCH FOOD BELOW", 195, 490, "#174b57");
  }

  private drawBathroom(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xd9ffff, 0.65).fillCircle(55, 120, 24).fillCircle(340, 150, 35).fillCircle(305, 85, 13);
    g.fillStyle(0x5fcbd3).fillRoundedRect(24, 425, 342, 120, 54);
    g.fillStyle(0xbef4f2, 0.8).fillEllipse(195, 438, 310, 66);
    this.label("문질러서 거품을 채워요", 195, 104, "#174b57");
  }

  private drawBedroom(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x27476d, 0.92).fillRect(0, 0, 390, 520);
    g.fillStyle(0xffecb0).fillCircle(315, 118, 36);
    g.fillStyle(0xffffff, 0.5).fillCircle(76, 95, 3).fillCircle(123, 150, 4).fillCircle(252, 82, 3);
    g.fillStyle(0x809bc5).fillRoundedRect(28, 430, 334, 112, 28);
    this.label("MOON REST MODE", 195, 100, "#f5f0d8");
  }

  private drawWellness(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xf7f4e5).fillRoundedRect(18, 85, 354, 168, 22);
    [0x65d7df, 0xa6d99b, 0xe98eb2, 0xa890df, 0x6c9ee8].forEach((color, index) => {
      g.fillStyle(color).fillRoundedRect(38 + index * 66, 126, 38, 86 - index * 4, 14);
      g.fillStyle(0xffffff, 0.55).fillCircle(57 + index * 66, 142, 8);
    });
    this.label("GAME-ONLY WELLNESS ITEMS", 195, 98, "#174b57");
  }

  private drawGameRoom(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x184d68).fillRoundedRect(22, 86, 346, 172, 26);
    g.fillStyle(0x42d7ca).fillCircle(92, 165, 38);
    g.fillStyle(0xffc85c).fillTriangle(180, 205, 220, 125, 258, 205);
    g.lineStyle(8, 0xed7c78).strokeCircle(315, 165, 38);
    this.label("3 PLAYABLE CURRENTS", 195, 240, "#dffff8");
  }

  private drawWardrobe(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xf5ead7).fillRoundedRect(24, 80, 342, 190, 24);
    g.lineStyle(8, 0x7b6b78).lineBetween(60, 120, 330, 120);
    [0x65c7c1, 0xef8576, 0x508cdb, 0xf4c95d].forEach((color, index) =>
      g.fillStyle(color).fillTriangle(90 + index * 68, 130, 62 + index * 68, 210, 118 + index * 68, 210)
    );
    this.label("KEEPER STYLE SETS", 195, 245, "#513f52");
  }

  private drawShop(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xfff3d8).fillRoundedRect(18, 82, 354, 176, 26);
    g.fillStyle(0x4db9b1).fillRoundedRect(32, 96, 326, 44, 15);
    g.fillStyle(0xef9a73).fillCircle(82, 190, 30);
    g.fillStyle(0x75b1d3).fillRoundedRect(146, 160, 60, 60, 18);
    g.fillStyle(0xf2ca67).fillTriangle(282, 154, 245, 220, 319, 220);
    this.label("COINS ONLY · NO PAYMENTS", 195, 122, "#effffb");
  }

  private palette(): { sky: number; floor: number } {
    const palettes: Record<string, { sky: number; floor: number }> = {
      sunlab: { sky: 0xf5e8c9, floor: 0xe4c68f },
      lagoon: { sky: 0x9be3dd, floor: 0x62b8b6 },
      coral: { sky: 0xf5b5a8, floor: 0xd98778 },
      midnight: { sky: 0x233c66, floor: 0x172b50 }
    };
    return palettes[this.theme] ?? palettes.sunlab!;
  }

  private label(text: string, x: number, y: number, color: string): void {
    this.add
      .text(x, y, text, { fontFamily: "system-ui, sans-serif", fontSize: "11px", fontStyle: "bold", color, align: "center" })
      .setOrigin(0.5)
      .setData("room-prop", true);
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
