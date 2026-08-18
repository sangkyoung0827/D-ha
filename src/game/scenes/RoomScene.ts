import Phaser from "phaser";
import type { CharacterAppearance, RoomId, WearableSlot } from "../../domain/types";
import { gameBridge } from "../bridge/GameBridge";
import { Keeper } from "../entities/Keeper";
import { applyHighDpiCamera } from "../renderQuality";
import type { OceanMode, OceanZoneId } from "../../domain/ocean";

interface RoomPresentation {
  room: RoomId;
  theme: string;
  style: CharacterAppearance & { equipped: Record<WearableSlot, string | null> };
  reducedMotion: boolean;
  oceanMode: OceanMode;
  oceanZone: OceanZoneId;
}

export class RoomScene extends Phaser.Scene {
  private room: RoomId = "studio";
  private theme = "sunlab";
  private background?: Phaser.GameObjects.Graphics;
  private backgroundImage?: Phaser.GameObjects.Image;
  private keeper?: Keeper;
  private fridgeHitZone?: Phaser.GameObjects.Zone;
  private ambience: Phaser.GameObjects.GameObject[] = [];
  private reducedMotion = false;
  private oceanMode: OceanMode = "exploration";
  private oceanZone: OceanZoneId = "beach";
  private bathDistance = 0;
  private lastPointer?: Phaser.Math.Vector2;
  private roomTransition?: Phaser.Time.TimerEvent;
  private cleanups: Array<() => void> = [];
  private style: CharacterAppearance & { equipped: Record<WearableSlot, string | null> } = {
    equipped: { top: "top-rookie", bottom: "bottom-sand", shoes: "shoes-deck", accessory: null },
    skinTone: "sand",
    hairStyle: "wave",
    hairColor: "midnight",
    glassesStyle: "none"
  };

  constructor() {
    super("room");
  }

  create(): void {
    applyHighDpiCamera(this);
    const initial = this.registry.get("initial-presentation") as RoomPresentation | undefined;
    if (initial) {
      this.room = initial.room;
      this.theme = initial.theme;
      this.style = initial.style;
      this.reducedMotion = initial.reducedMotion;
      this.oceanMode = initial.oceanMode ?? "exploration";
      this.oceanZone = initial.oceanZone ?? "beach";
    }
    this.backgroundImage = this.add.image(195, 350, "ocean-beach-game").setDisplaySize(390, 700).setDepth(-2).setVisible(false);
    this.background = this.add.graphics().setDepth(-1);
    this.keeper = new Keeper(this, 195, 405, this.style).setDepth(3);
    this.keeper.setReducedMotion(this.reducedMotion);
    this.fridgeHitZone = this.add.zone(65, 218, 104, 260).setDepth(6);
    this.fridgeHitZone.on("pointerdown", () => {
      if (this.room === "kitchen") gameBridge.emit("kitchen:fridge-open", undefined);
    });
    this.drawRoom();

    this.cleanups = [
      gameBridge.on("room:change", ({ room, theme }) => {
        this.room = room;
        this.theme = theme;
        this.bathDistance = 0;
        this.transitionRoom();
      }),
      gameBridge.on("ocean:view", ({ mode, zone }) => {
        this.oceanMode = mode;
        this.oceanZone = zone;
        if (this.room === "wellness") this.drawRoom();
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
      gameBridge.on("settings:motion", ({ reduced }) => {
        this.reducedMotion = reduced;
        this.keeper?.setReducedMotion(reduced);
        this.drawRoom();
      }),
      gameBridge.on("kitchen:fridge-open", () => {
        if (this.room === "kitchen") this.animateFridgeDoor();
      })
    ];

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.lastPointer = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.trackBath(pointer));
    this.input.on("pointerup", () => {
      this.lastPointer = undefined;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private trackBath(pointer: Phaser.Input.Pointer): void {
    if (this.room !== "bathroom" || !pointer.isDown || !this.lastPointer) return;
    const distance = Phaser.Math.Distance.Between(this.lastPointer.x, this.lastPointer.y, pointer.worldX, pointer.worldY);
    this.lastPointer.set(pointer.worldX, pointer.worldY);
    if (pointer.worldY < 190 || pointer.worldY > 570) return;
    this.bathDistance = Math.min(100, this.bathDistance + distance / 3.2);
    if (Math.random() > 0.55) this.addBubble(pointer.worldX, pointer.worldY);
    gameBridge.emit("bath:progress", { progress: Math.round(this.bathDistance) });
    if (this.bathDistance >= 100) {
      this.bathDistance = 0;
      gameBridge.emit("bath:complete", undefined);
      this.bubbleBurst();
    }
  }

  private transitionRoom(): void {
    this.roomTransition?.destroy();
    if (this.reducedMotion) {
      this.drawRoom();
      return;
    }
    this.cameras.main.fadeOut(90, 244, 248, 240);
    this.roomTransition = this.time.delayedCall(90, () => {
      this.drawRoom();
      this.cameras.main.fadeIn(180, 244, 248, 240);
      this.roomTransition = undefined;
    });
  }

  private drawRoom(): void {
    if (!this.background) return;
    this.clearAmbience();
    this.backgroundImage?.setVisible(false);
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
    this.syncRoomInteractions();
  }

  private syncRoomInteractions(): void {
    if (!this.fridgeHitZone) return;
    if (this.room === "kitchen") this.fridgeHitZone.setInteractive({ useHandCursor: true });
    else this.fridgeHitZone.disableInteractive();
  }

  private animateFridgeDoor(): void {
    if (this.reducedMotion) return;
    const door = this.add.rectangle(65, 218, 94, 248, 0xccece5, 0.82)
      .setStrokeStyle(3, 0x6faaa4, 0.78)
      .setDepth(2);
    this.tweens.add({
      targets: door,
      x: 22,
      scaleX: 0.12,
      alpha: 0.24,
      duration: 210,
      yoyo: true,
      hold: 50,
      ease: "Sine.easeInOut",
      onComplete: () => door.destroy()
    });
  }

  private drawHome(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0xf4f0e7, 0xf4f0e7, 0xe9dfcf, 0xe9dfcf, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xd7c29d).fillRect(0, 505, 390, 195);
    g.fillStyle(0xf8f4ea).fillRect(0, 499, 390, 9);
    g.lineStyle(1, 0xbca57e, 0.3);
    for (let x = -40; x < 430; x += 62) g.lineBetween(x, 505, x + 44, 700);

    // A wide picture window with a layered horizon, distant islands and moving light on the sea.
    g.fillStyle(0xd9d3c7).fillRoundedRect(27, 62, 336, 280, 31);
    g.fillGradientStyle(0xaedfdc, 0xc9e9e2, 0xe8e0bf, 0xe8e0bf, 1).fillRoundedRect(39, 74, 312, 256, 23);
    g.fillStyle(0xf4cf78, 0.95).fillCircle(294, 126, 27);
    g.fillStyle(0xffffff, 0.32).fillEllipse(123, 125, 104, 26).fillEllipse(205, 104, 70, 18);
    g.fillStyle(0x73b9b5, 0.62).fillEllipse(96, 195, 124, 31).fillEllipse(288, 205, 148, 38);
    g.fillStyle(0x4c8d94, 0.74).fillEllipse(88, 213, 102, 29).fillEllipse(302, 220, 127, 34);
    g.fillStyle(0x62bbc0).fillRoundedRect(39, 211, 312, 119, 18);
    g.fillStyle(0x8ed3cf, 0.72).fillRoundedRect(39, 235, 312, 95, 17);
    g.fillStyle(0xd5f0e8, 0.36).fillEllipse(192, 246, 332, 64);
    g.lineStyle(2, 0xffffff, 0.52).beginPath().moveTo(58, 264).lineTo(108, 255).lineTo(158, 269).lineTo(214, 258).lineTo(268, 273).lineTo(333, 260).strokePath();
    g.lineStyle(8, 0xf9f5ec, 0.96).strokeRoundedRect(27, 62, 336, 280, 31);
    g.lineStyle(5, 0xf9f5ec, 0.9).lineBetween(195, 68, 195, 336).lineBetween(32, 207, 358, 207);
    g.lineStyle(1.5, 0xffffff, 0.42).lineBetween(49, 90, 49, 315).lineBetween(341, 90, 341, 315);

    // Warm interior details and floor texture.
    g.fillStyle(this.themeAccent(), 0.2).fillEllipse(195, 584, 235, 72);
    g.fillStyle(0xffffff, 0.18).fillTriangle(52, 342, 176, 342, 116, 650);
    g.fillStyle(0xb68e66).fillRoundedRect(292, 431, 67, 10, 5).fillRoundedRect(302, 440, 8, 92, 4).fillRoundedRect(341, 440, 8, 92, 4);
    g.fillStyle(0xe6c77e).fillCircle(326, 415, 20);
    g.fillStyle(0xefd8b0).fillRoundedRect(22, 475, 61, 69, 15).fillRoundedRect(313, 478, 53, 70, 14);
    g.fillStyle(0xd0ad7d).fillRoundedRect(26, 489, 53, 13, 6).fillRoundedRect(317, 491, 45, 12, 6);
    g.fillStyle(0x78958b).fillRoundedRect(91, 377, 58, 10, 5);
    g.fillStyle(0xe8be73).fillRoundedRect(98, 354, 12, 22, 3).fillRoundedRect(113, 348, 10, 28, 3).fillRoundedRect(126, 357, 14, 19, 3);
    this.addHomeAmbience();
  }

  private drawKitchen(g: Phaser.GameObjects.Graphics): void {
    this.showGameBackground("kitchen-game");
    this.drawPhotoReadability(g, 0x173d48, 0.08);
    this.addStylizedRoomAmbience("kitchen");
  }

  private drawOcean(g: Phaser.GameObjects.Graphics): void {
    if (this.oceanMode === "coastal-road") {
      this.drawCoastalRoad(g);
      return;
    }
    if (this.oceanZone === "beach") this.drawOceanBeach(g);
    else if (this.oceanZone === "open-water") this.drawOpenWater(g);
    else if (this.oceanZone === "surf") this.drawSurf(g);
    else if (this.oceanZone === "cave") this.drawCave(g);
    else this.drawDeepSea(g);
    this.addOceanAmbience();
  }

  private drawOceanBeach(g: Phaser.GameObjects.Graphics): void {
    this.showGameBackground("ocean-beach-game");
    g.fillStyle(0x05324c, 0.08).fillRect(0, 0, 390, 120);
    g.fillStyle(0x173d48, 0.13).fillEllipse(286, 456, 94, 17);
  }

  private drawOpenWater(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0x47c9cf, 0x47c9cf, 0x075b80, 0x063b67, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xdffcf1, 0.48).fillRect(0, 0, 390, 24);
    g.fillStyle(0xffffff, 0.12).fillTriangle(20, 0, 104, 0, 166, 540).fillTriangle(181, 0, 238, 0, 284, 500).fillTriangle(306, 0, 366, 0, 342, 460);
    this.drawFish(g, 76, 176, 0xffd06b, 1);
    this.drawFish(g, 302, 234, 0xf18b79, -1);
    this.drawFish(g, 102, 326, 0xb5efdf, 1);
    this.drawFish(g, 320, 390, 0xf7d48c, -1);
    g.fillStyle(0x0d4f67).fillEllipse(55, 596, 160, 86).fillEllipse(345, 610, 180, 110);
    g.lineStyle(7, 0x37a677).beginPath().moveTo(40, 635).lineTo(52, 520).moveTo(79, 650).lineTo(94, 535).moveTo(327, 654).lineTo(306, 531).moveTo(362, 645).lineTo(374, 548).strokePath();
  }

  private drawSurf(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0x82dcd7, 0xb9e9dd, 0x1b719a, 0x164f7b, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xffdd79).fillCircle(322, 82, 29);
    g.fillStyle(0xffffff, 0.52).fillEllipse(109, 87, 135, 25);
    g.fillStyle(0x2187aa).fillRect(0, 215, 390, 485);
    g.fillStyle(0x85dad5, 0.82).fillEllipse(82, 315, 300, 150).fillEllipse(344, 353, 340, 188);
    g.fillStyle(0xe8ffef, 0.92).beginPath().moveTo(-20, 315).lineTo(35, 264).lineTo(92, 252).lineTo(139, 282).lineTo(184, 336).lineTo(237, 385).lineTo(295, 399).lineTo(351, 348).lineTo(410, 299).lineTo(410, 367).lineTo(354, 410).lineTo(296, 447).lineTo(232, 430).lineTo(173, 374).lineTo(105, 317).lineTo(42, 322).lineTo(-20, 374).closePath().fillPath();
    g.fillStyle(0x174d68).fillTriangle(300, 344, 322, 302, 344, 344).fillTriangle(54, 448, 75, 411, 96, 448);
    g.fillStyle(0xf3b85f).fillEllipse(200, 381, 94, 17);
    g.lineStyle(3, 0xffffff, 0.72).strokeEllipse(200, 381, 94, 17);
  }

  private drawCave(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0x173d5a, 0x173d5a, 0x111d3d, 0x090f28, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0x071126).beginPath().moveTo(0, 0).lineTo(134, 0).lineTo(104, 58).lineTo(142, 107).lineTo(88, 148).lineTo(120, 205).lineTo(54, 270).lineTo(91, 329).lineTo(0, 392).closePath().fillPath();
    g.fillStyle(0x080f22).beginPath().moveTo(390, 0).lineTo(276, 0).lineTo(302, 63).lineTo(255, 112).lineTo(307, 168).lineTo(264, 231).lineTo(334, 295).lineTo(291, 372).lineTo(390, 423).closePath().fillPath();
    g.fillStyle(0x704fa1, 0.16).fillCircle(195, 248, 132).fillCircle(195, 248, 80);
    [[83,130],[286,171],[126,286],[307,337],[192,108]].forEach(([x,y], index) => {
      g.fillStyle(index % 2 ? 0x66e4d0 : 0xa99cef, 0.86).fillCircle(x!, y!, 4 + index % 3);
      g.lineStyle(1, 0xcffff5, 0.28).strokeCircle(x!, y!, 15 + index * 6);
    });
    g.fillStyle(0x172746).fillEllipse(195, 625, 330, 136);
    g.fillStyle(0x3cc8af, 0.5).fillEllipse(155, 580, 42, 10).fillEllipse(258, 616, 50, 12);
  }

  private drawDeepSea(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0x142e59, 0x142e59, 0x060b25, 0x020516, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0x4269a8, 0.1).fillCircle(195, 240, 190).fillCircle(195, 240, 120);
    for (let index = 0; index < 34; index += 1) {
      const x = (index * 83) % 390;
      const y = 55 + ((index * 137) % 520);
      g.fillStyle(index % 4 ? 0x6be0d4 : 0xbab3ff, 0.22 + (index % 5) * 0.11).fillCircle(x, y, 1 + index % 3);
    }
    g.fillStyle(0x122040).fillEllipse(54, 640, 190, 100).fillEllipse(334, 625, 210, 122);
    g.fillStyle(0x79ead6, 0.62).fillEllipse(81, 517, 22, 8).fillCircle(89, 516, 2).fillEllipse(301, 423, 31, 11).fillCircle(290, 421, 2);
    g.fillStyle(0xf0c960).fillEllipse(197, 332, 74, 38);
    g.fillStyle(0x183859).fillRoundedRect(165, 312, 65, 40, 20);
    g.fillStyle(0x8ce9e0).fillRoundedRect(180, 319, 29, 17, 8);
    g.fillStyle(0xf7db7f, 0.14).fillTriangle(229, 326, 390, 257, 390, 397);
  }

  private drawCoastalRoad(g: Phaser.GameObjects.Graphics): void {
    g.fillGradientStyle(0xa4e2dc, 0xc7ebe1, 0x6dc6c4, 0x377f9c, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xffd577).fillCircle(315, 88, 32);
    g.fillStyle(0x328baa).fillRect(0, 210, 390, 300);
    g.fillStyle(0x8bd8d0, 0.62).fillEllipse(195, 229, 470, 65);
    g.fillStyle(0x4f876c).fillTriangle(0, 274, 98, 154, 188, 306).fillTriangle(251, 305, 352, 169, 420, 289);
    g.fillStyle(0x3f4e57).beginPath().moveTo(44, 700).lineTo(155, 330).lineTo(190, 286).lineTo(230, 260).lineTo(278, 254).lineTo(330, 266).lineTo(390, 315).lineTo(390, 700).closePath().fillPath();
    g.lineStyle(5, 0xf7dd7c, 0.86).beginPath().moveTo(194, 700).lineTo(221, 529).lineTo(238, 432).lineTo(258, 350).lineTo(285, 287).strokePath();
    g.lineStyle(5, 0xffffff, 0.76).beginPath().moveTo(48, 651).lineTo(153, 343).lineTo(188, 298).lineTo(229, 273).lineTo(275, 269).lineTo(326, 279).strokePath();
  }

  private addOceanAmbience(): void {
    const colors = this.oceanZone === "deepsea" || this.oceanZone === "cave" ? [0x76ead4, 0xb6aaff] : [0xffffff, 0xd4fff4];
    for (let index = 0; index < 7; index += 1) {
      const mote = this.add.circle(30 + ((index * 73) % 340), 90 + ((index * 91) % 380), 2 + index % 4, colors[index % 2]!, 0.22 + index * 0.05).setDepth(1);
      this.ambience.push(mote);
      if (!this.reducedMotion) this.tweens.add({ targets: mote, y: mote.y - 34 - index * 3, x: mote.x + (index % 2 ? 9 : -9), alpha: 0.08, duration: 2500 + index * 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private drawBathroom(g: Phaser.GameObjects.Graphics): void {
    this.showGameBackground("bathroom-game");
    this.drawPhotoReadability(g, 0x1d5a60, 0.07);
    this.addStylizedRoomAmbience("bathroom");
  }

  private drawBedroom(g: Phaser.GameObjects.Graphics): void {
    this.showGameBackground("bedroom-game");
    this.drawPhotoReadability(g, 0x07182e, 0.14);
    this.addStylizedRoomAmbience("bedroom");
  }

  private drawCloset(g: Phaser.GameObjects.Graphics): void {
    this.showGameBackground("wardrobe-game");
    this.drawPhotoReadability(g, 0x4a2d1b, 0.08);
    this.addStylizedRoomAmbience("wardrobe");
  }

  private drawWorkout(g: Phaser.GameObjects.Graphics): void {
    this.showGameBackground("workout-game");
    this.drawPhotoReadability(g, 0x082e39, 0.09);
    this.addStylizedRoomAmbience("workout");
  }

  private showGameBackground(texture: string): void {
    this.backgroundImage?.setTexture(texture).setDisplaySize(390, 700).clearTint().setVisible(true);
  }

  private drawPhotoReadability(g: Phaser.GameObjects.Graphics, color: number, alpha: number): void {
    g.fillGradientStyle(color, color, color, color, alpha, alpha, 0, 0).fillRect(0, 0, 390, 112);
    g.fillStyle(0x06191e, 0.09).fillEllipse(195, 548, 204, 46);
  }

  private addStylizedRoomAmbience(room: "kitchen" | "bathroom" | "bedroom" | "wardrobe" | "workout"): void {
    const palettes = {
      kitchen: [0xfff1c2, 0xffffff],
      bathroom: [0xe8ffff, 0xbbe9e7],
      bedroom: [0xc7ddff, 0xffdda0],
      wardrobe: [0xffddb0, 0xffffff],
      workout: [0xffe8a4, 0xd8ffff]
    } as const;
    const colors = palettes[room];
    const count = room === "bathroom" ? 8 : 6;
    for (let index = 0; index < count; index += 1) {
      const x = 32 + ((index * 71) % 326);
      const y = room === "bathroom" ? 175 + ((index * 53) % 280) : 92 + ((index * 89) % 390);
      const radius = room === "bathroom" ? 3 + index % 4 : 1.2 + index % 3;
      const mote = this.add.circle(x, y, radius, colors[index % 2]!, room === "bedroom" ? 0.14 : 0.2).setDepth(1);
      this.ambience.push(mote);
      if (!this.reducedMotion) {
        this.tweens.add({
          targets: mote,
          x: x + (index % 2 ? 8 : -8),
          y: y - (room === "bathroom" ? 42 : 18),
          alpha: room === "bedroom" ? 0.28 : 0.08,
          scale: room === "bathroom" ? 1.65 : 1.15,
          duration: 2600 + index * 360,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }
    }

    if (room === "bedroom") {
      const moonGlow = this.add.ellipse(76, 242, 82, 210, 0x8bbcff, 0.06).setAngle(-16).setDepth(0).setBlendMode(Phaser.BlendModes.ADD);
      this.ambience.push(moonGlow);
      if (!this.reducedMotion) this.tweens.add({ targets: moonGlow, alpha: 0.13, duration: 3800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    if (room === "workout") {
      const sunFlare = this.add.circle(336, 94, 38, 0xffe7a0, 0.05).setDepth(0).setBlendMode(Phaser.BlendModes.ADD);
      this.ambience.push(sunFlare);
      if (!this.reducedMotion) this.tweens.add({ targets: sunFlare, scale: 1.24, alpha: 0.13, duration: 3000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private addHomeAmbience(): void {
    const leftPlant = this.drawIndoorPlant(53, 493, 0.88, -1, 0x4f9272, 0x79b88b);
    const rightPlant = this.drawIndoorPlant(340, 496, 0.82, 1, 0x397f69, 0x6fb283);

    const leftCurtain = this.add.graphics().setPosition(29, 72).setDepth(1).setAlpha(0.46);
    leftCurtain.fillStyle(0xfffdf5, 0.72).fillRoundedRect(0, 0, 22, 250, 11);
    leftCurtain.fillStyle(0xc7ded8, 0.2).fillRoundedRect(7, 0, 5, 250, 3).fillTriangle(19, 0, 42, 0, 22, 176);
    const rightCurtain = this.add.graphics().setPosition(339, 72).setDepth(1).setAlpha(0.46);
    rightCurtain.fillStyle(0xfffdf5, 0.72).fillRoundedRect(0, 0, 22, 250, 11);
    rightCurtain.fillStyle(0xc7ded8, 0.2).fillRoundedRect(9, 0, 5, 250, 3).fillTriangle(3, 0, -20, 0, 0, 176);
    this.ambience.push(leftPlant, rightPlant, leftCurtain, rightCurtain);

    for (let index = 0; index < 4; index += 1) {
      const wave = this.add.graphics().setPosition(65 + index * 73, 237 + (index % 2) * 31).setDepth(1).setAlpha(0.38 + index * 0.08);
      wave.lineStyle(2, 0xffffff, 0.88).beginPath().moveTo(0, 0).lineTo(18, -2).lineTo(37, 1).lineTo(55, -1).strokePath();
      this.ambience.push(wave);
      if (!this.reducedMotion) this.tweens.add({ targets: wave, x: wave.x + 14, alpha: 0.72, duration: 2200 + index * 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    if (!this.reducedMotion) {
      this.tweens.add({ targets: leftPlant, angle: 1.8, x: leftPlant.x + 2, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: rightPlant, angle: -1.5, x: rightPlant.x - 2, duration: 3100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: leftCurtain, x: leftCurtain.x + 3, alpha: 0.54, duration: 3600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: rightCurtain, x: rightCurtain.x - 3, alpha: 0.54, duration: 3900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private drawIndoorPlant(x: number, y: number, scale: number, direction: -1 | 1, dark: number, light: number): Phaser.GameObjects.Graphics {
    const plant = this.add.graphics().setPosition(x, y).setScale(scale).setDepth(1);
    plant.lineStyle(3, dark, 0.92).beginPath().moveTo(0, 0).lineTo(direction * 2, -92).moveTo(0, -24).lineTo(direction * -24, -68).moveTo(direction * 1, -42).lineTo(direction * 29, -89).moveTo(direction * 1, -66).lineTo(direction * -19, -112).moveTo(direction * 1, -76).lineTo(direction * 22, -130).strokePath();
    const leaves: Array<[number, number, number, number, number]> = [
      [-24, -70, 42, 19, 0], [25, -90, 45, 20, 1], [-18, -113, 38, 18, 1], [20, -130, 42, 19, 0], [2, -95, 35, 18, 0], [30, -59, 37, 17, 1], [-30, -48, 34, 16, 0]
    ];
    leaves.forEach(([leafX, leafY, width, height, alternate]) => {
      plant.fillStyle(alternate ? light : dark).fillEllipse(direction * leafX, leafY, width, height);
      plant.fillStyle(0xffffff, 0.13).fillEllipse(direction * (leafX - 4), leafY - 3, width * 0.42, height * 0.26);
    });
    plant.fillStyle(light).fillEllipse(0, -142, 30, 17);
    return plant;
  }

  private clearAmbience(): void {
    this.ambience.forEach((object) => {
      this.tweens.killTweensOf(object);
      object.destroy();
    });
    this.ambience = [];
  }

  private drawFish(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, direction: 1 | -1): void {
    g.fillStyle(color).fillEllipse(x, y, 42, 23);
    g.fillTriangle(x - 18 * direction, y, x - 38 * direction, y - 15, x - 38 * direction, y + 15);
    g.fillStyle(0x173d48).fillCircle(x + 11 * direction, y - 3, 2);
  }

  private placeKeeper(): void {
    if (!this.keeper) return;
    const placements: Record<RoomId, { x: number; y: number; scale: number; pose: "standing" | "sleeping" }> = {
      studio: { x: 195, y: 408, scale: 1.13, pose: "standing" },
      kitchen: { x: 202, y: 420, scale: 0.96, pose: "standing" },
      wellness: { x: 306, y: 440, scale: 0.6, pose: "standing" },
      bathroom: { x: 205, y: 416, scale: 0.92, pose: "standing" },
      bedroom: { x: 211, y: 370, scale: 0.65, pose: "sleeping" },
      wardrobe: { x: 194, y: 424, scale: 0.94, pose: "standing" },
      "game-room": { x: 188, y: 418, scale: 0.96, pose: "standing" },
      shop: { x: 202, y: 420, scale: 0.96, pose: "standing" }
    };
    this.keeper.setVisible(true).setAngle(0);
    if (this.room === "wellness") {
      const oceanPlacements: Record<OceanZoneId, { x: number; y: number; scale: number; angle: number }> = {
        beach: { x: 286, y: 392, scale: 0.52, angle: 0 },
        "open-water": { x: 195, y: 323, scale: 0.42, angle: -72 },
        surf: { x: 197, y: 340, scale: 0.4, angle: -8 },
        cave: { x: 194, y: 335, scale: 0.38, angle: -12 },
        deepsea: { x: 194, y: 334, scale: 0.33, angle: 0 }
      };
      const oceanPlacement = this.oceanMode === "coastal-road" ? { x: 210, y: 390, scale: 0.45, angle: 0 } : oceanPlacements[this.oceanZone];
      this.keeper.setRoomPresentation(oceanPlacement.x, oceanPlacement.y, oceanPlacement.scale, "standing");
      this.keeper.setAngle(oceanPlacement.angle);
      return;
    }
    const placement = placements[this.room];
    this.keeper.setRoomPresentation(placement.x, placement.y, placement.scale, placement.pose);
  }

  private themeAccent(): number {
    return { sunlab: 0x53c2b9, lagoon: 0x3aaeb3, coral: 0xe98978, midnight: 0x667fbd }[this.theme] ?? 0x53c2b9;
  }

  private addBubble(x: number, y: number): void {
    const textureScale = Number(this.registry.get("particle-display-scale")) || 1;
    const bubble = this.add.image(x, y, "bubble").setScale(Phaser.Math.FloatBetween(0.6, 1.5) * textureScale).setDepth(8);
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
      sparkle.setScale(Number(this.registry.get("particle-display-scale")) || 1);
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
    this.clearAmbience();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.roomTransition?.destroy();
    this.roomTransition = undefined;
    this.fridgeHitZone?.removeAllListeners();
    this.input.removeAllListeners();
  }
}
