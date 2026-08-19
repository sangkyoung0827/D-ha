import Phaser from "phaser";
import type { PetAppearance } from "../../domain/pet";
import type { RoomId, WearableSlot } from "../../domain/types";
import { gameBridge } from "../bridge/GameBridge";
import { PetCharacter } from "../entities/PetCharacter";
import { applyHighDpiCamera } from "../renderQuality";
import type { OceanMode, OceanZoneId } from "../../domain/ocean";
import { isHomeInterior } from "../../domain/home";

interface RoomPresentation {
  room: RoomId;
  theme: string;
  style: PetAppearance & { equipped: Record<WearableSlot, string | null> };
  reducedMotion: boolean;
  oceanMode: OceanMode;
  oceanZone: OceanZoneId;
}

interface DoorSpec {
  id: string;
  label: string;
  destination: RoomId;
  x: number;
  y: number;
  width: number;
  height: number;
  approachX?: number;
  approachY: number;
  texture?: string;
  color: number;
  opensTo?: -1 | 1;
}

interface DoorView {
  spec: DoorSpec;
  leaf: Phaser.GameObjects.Container;
  enterZone: Phaser.GameObjects.Zone;
  closeHitZone: Phaser.GameObjects.Zone;
  closeButton: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  objects: Phaser.GameObjects.GameObject[];
  open: boolean;
}

export class RoomScene extends Phaser.Scene {
  private room: RoomId = "studio";
  private theme = "sunlab";
  private background?: Phaser.GameObjects.Graphics;
  private backgroundImage?: Phaser.GameObjects.Image;
  private pet?: PetCharacter;
  private fridgeHitZone?: Phaser.GameObjects.Zone;
  private ambience: Phaser.GameObjects.GameObject[] = [];
  private doors: DoorView[] = [];
  private pointerMarker?: Phaser.GameObjects.Container;
  private doorInteractionAt = -1_000;
  private enteringDoor = false;
  private reducedMotion = false;
  private oceanMode: OceanMode = "exploration";
  private oceanZone: OceanZoneId = "beach";
  private bathDistance = 0;
  private lastPointer?: Phaser.Math.Vector2;
  private roomTransition?: Phaser.Time.TimerEvent;
  private cleanups: Array<() => void> = [];
  private style: PetAppearance & { equipped: Record<WearableSlot, string | null> } = {
    equipped: { top: "top-rookie", bottom: "bottom-sand", shoes: "shoes-deck", accessory: null },
    species: "dog",
    breed: "maltese",
    furColor: "snow",
    pattern: "solid",
    collar: "teal",
    hat: "none",
    accessory: "none",
    outfit: "tee"
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
    this.pet = new PetCharacter(this, 195, 405, this.style).setDepth(3);
    this.pet.setReducedMotion(this.reducedMotion);
    this.pointerMarker = this.add.container(195, 500, [
      this.add.circle(0, 0, 22, 0xffffff, 0.78).setStrokeStyle(3, 0x168e8c, 0.9),
      this.add.text(0, -1, "☝", { fontFamily: "system-ui", fontSize: "18px", resolution: Number(this.registry.get("render-scale")) || 1 }).setOrigin(0.5)
    ]).setDepth(12).setVisible(false);
    this.fridgeHitZone = this.add.zone(65, 218, 104, 260).setDepth(6);
    this.fridgeHitZone.on("pointerdown", () => {
      if (this.room === "kitchen") gameBridge.emit("kitchen:fridge-open", undefined);
    });
    this.drawRoom();

    this.cleanups = [
      gameBridge.on("room:change", ({ room, theme }) => {
        const roomChanged = this.room !== room;
        const themeChanged = this.theme !== theme;
        this.room = room;
        this.theme = theme;
        this.bathDistance = 0;
        if (roomChanged) this.transitionRoom();
        else if (themeChanged) this.drawRoom();
      }),
      gameBridge.on("ocean:view", ({ mode, zone }) => {
        this.oceanMode = mode;
        this.oceanZone = zone;
        if (this.room === "wellness") this.drawRoom();
      }),
      gameBridge.on("pet:style", (style) => {
        this.style = style;
        this.pet?.updateStyle(style);
      }),
      gameBridge.on("pet:react", ({ action }) => {
        this.pet?.react(action);
        if (action === "wash") this.bubbleBurst();
        if (action === "level") this.sparkleBurst();
      }),
      gameBridge.on("settings:motion", ({ reduced }) => {
        this.reducedMotion = reduced;
        this.pet?.setReducedMotion(reduced);
        this.drawRoom();
      }),
      gameBridge.on("kitchen:fridge-open", () => {
        if (this.room === "kitchen") this.animateFridgeDoor();
      })
    ];

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.lastPointer = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      if (this.time.now - this.doorInteractionAt > 80) this.walkFromPointer(pointer.worldX, pointer.worldY);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.trackBath(pointer);
      if (pointer.isDown && this.room !== "bathroom" && this.lastPointer && Phaser.Math.Distance.Between(this.lastPointer.x, this.lastPointer.y, pointer.worldX, pointer.worldY) > 24) {
        this.lastPointer.set(pointer.worldX, pointer.worldY);
        this.walkFromPointer(pointer.worldX, pointer.worldY);
      }
    });
    this.input.on("pointerup", () => {
      this.lastPointer = undefined;
    });
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => this.walkFromKeyboard(event));
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
    this.clearDoors();
    this.pointerMarker?.setVisible(false);
    this.enteringDoor = false;
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
    this.placePet();
    this.setupRoomDoors();
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
    g.fillGradientStyle(0xf5eee1, 0xfff8eb, 0xe7d8bf, 0xd8c29f, 1).fillRect(0, 0, 390, 700);
    g.fillStyle(0xd9c69e).fillRect(0, 420, 390, 280);
    g.fillStyle(0xfffbef).fillRect(0, 412, 390, 12);
    g.lineStyle(1, 0xb99b70, 0.32);
    for (let x = -110; x < 470; x += 54) g.lineBetween(x, 420, x + 86, 700);
    for (let y = 468; y < 700; y += 48) g.lineBetween(0, y, 390, y);

    g.fillStyle(0xe8dcc7).fillRoundedRect(8, 52, 374, 361, 18);
    g.fillStyle(0xfffbf0, 0.7).fillRoundedRect(16, 60, 358, 344, 14);
    g.fillStyle(this.themeAccent(), 0.1).fillRoundedRect(19, 64, 352, 336, 12);
    g.fillStyle(0xc49b70, 0.24).fillRect(0, 395, 390, 22);

    // Furniture is kept low so every physical door remains readable and reachable.
    g.fillStyle(0x9bb7a4).fillRoundedRect(111, 424, 168, 64, 22);
    g.fillStyle(0xc8dbca).fillRoundedRect(123, 412, 64, 38, 18).fillRoundedRect(202, 412, 64, 38, 18);
    g.fillStyle(0x6f8f82, 0.24).fillRoundedRect(128, 480, 12, 40, 5).fillRoundedRect(250, 480, 12, 40, 5);
    g.fillStyle(0xb8855d).fillRoundedRect(146, 505, 98, 12, 6).fillRoundedRect(154, 516, 8, 38, 4).fillRoundedRect(228, 516, 8, 38, 4);
    g.fillStyle(0xf2d58d).fillEllipse(195, 506, 74, 20);
    g.fillStyle(this.themeAccent(), 0.2).fillEllipse(195, 585, 250, 82);
    g.fillStyle(0xffffff, 0.18).fillTriangle(145, 60, 257, 60, 318, 670);

    for (let index = 0; index < 7; index += 1) {
      const dust = this.add.circle(44 + index * 49, 155 + (index % 3) * 83, 1.5 + index % 2, 0xffffff, 0.28).setDepth(1);
      this.ambience.push(dust);
      if (!this.reducedMotion) this.tweens.add({ targets: dust, y: dust.y - 18, x: dust.x + (index % 2 ? 5 : -5), alpha: 0.08, duration: 2600 + index * 230, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private setupRoomDoors(): void {
    const homeDoors: DoorSpec[] = [
      { id: "kitchen", label: "주방", destination: "kitchen", x: 37, y: 242, width: 54, height: 158, approachX: 70, approachY: 398, texture: "kitchen-game", color: 0xd9a96e, opensTo: -1 },
      { id: "bathroom", label: "욕실", destination: "bathroom", x: 98, y: 242, width: 54, height: 158, approachX: 110, approachY: 398, texture: "bathroom-game", color: 0x8fc6bf, opensTo: 1 },
      { id: "ocean", label: "현관 · Ocean", destination: "wellness", x: 195, y: 223, width: 120, height: 240, approachY: 404, texture: "ocean-beach-game", color: 0x4f9ea4, opensTo: -1 },
      { id: "bedroom", label: "침실", destination: "bedroom", x: 292, y: 242, width: 54, height: 158, approachX: 280, approachY: 398, texture: "bedroom-game", color: 0x7f91b8, opensTo: -1 },
      { id: "wardrobe", label: "옷장", destination: "wardrobe", x: 353, y: 242, width: 54, height: 158, approachX: 320, approachY: 398, texture: "wardrobe-game", color: 0xb7875f, opensTo: 1 }
    ];
    if (this.room === "studio") {
      homeDoors.forEach((door) => this.createDoor(door));
      return;
    }

    if (isHomeInterior(this.room)) {
      this.createDoor({ id: `${this.room}-home`, label: "거실로", destination: "studio", x: 344, y: 260, width: 72, height: 192, approachX: 304, approachY: 412, color: 0x5d8f88, opensTo: 1 });
      return;
    }

    if (this.room === "game-room") {
      this.createDoor({ id: "workout-home", label: "정원문 · Home", destination: "studio", x: 344, y: 270, width: 72, height: 184, approachX: 302, approachY: 418, color: 0x4d9273, opensTo: 1 });
    }
  }

  private createDoor(spec: DoorSpec): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const opening = this.add.rectangle(spec.x, spec.y, spec.width, spec.height, 0x173847, 0.92).setDepth(1);
    objects.push(opening);
    if (spec.texture) {
      const preview = this.add.image(spec.x, spec.y, spec.texture).setDisplaySize(spec.width - 8, spec.height - 8).setDepth(1.2).setAlpha(0.92);
      objects.push(preview);
    } else {
      const preview = this.add.rectangle(spec.x, spec.y, spec.width - 8, spec.height - 8, 0xf5e6c8).setDepth(1.2);
      const horizon = this.add.rectangle(spec.x, spec.y - 12, spec.width - 10, 42, 0x8ed3cf, 0.8).setDepth(1.3);
      objects.push(preview, horizon);
    }

    const frame = this.add.graphics().setDepth(2);
    frame.lineStyle(9, 0xfffbef, 0.98).strokeRoundedRect(spec.x - spec.width / 2 - 4, spec.y - spec.height / 2 - 5, spec.width + 8, spec.height + 10, 7);
    frame.lineStyle(2, 0x6c5743, 0.42).strokeRoundedRect(spec.x - spec.width / 2, spec.y - spec.height / 2, spec.width, spec.height, 4);
    objects.push(frame);

    const leaf = this.add.container(spec.x, spec.y, [
      this.add.rectangle(0, 0, spec.width - 8, spec.height - 8, spec.color).setStrokeStyle(2, 0xffffff, 0.58),
      this.add.rectangle(0, -spec.height * 0.22, spec.width - 20, spec.height * 0.31, 0xffffff, 0.11).setStrokeStyle(1, 0xffffff, 0.22),
      this.add.rectangle(0, spec.height * 0.2, spec.width - 20, spec.height * 0.28, 0x173847, 0.06).setStrokeStyle(1, 0xffffff, 0.17),
      this.add.circle((spec.width / 2 - 15) * -(spec.opensTo ?? 1), 3, Math.max(3, spec.width * 0.055), 0xf6d677).setStrokeStyle(1, 0x694e31, 0.55)
    ]).setDepth(4);
    objects.push(leaf);

    const label = this.add.text(spec.x, spec.y + spec.height / 2 + 13, `${spec.label} · 열기`, {
      fontFamily: "system-ui",
      fontSize: spec.width > 80 ? "9px" : "7px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "#173d48d9",
      padding: { x: 7, y: 4 },
      resolution: Number(this.registry.get("render-scale")) || 1
    }).setOrigin(0.5).setDepth(6);
    objects.push(label);

    const enterZone = this.add.zone(spec.x, spec.y, spec.width, spec.height).setDepth(8).setInteractive({ useHandCursor: true });
    const closeIcon = this.add.text(0, 0, "×", { fontFamily: "system-ui", fontSize: "16px", fontStyle: "bold", color: "#ffffff", resolution: Number(this.registry.get("render-scale")) || 1 }).setOrigin(0.5);
    const closeButton = this.add.container(spec.x + spec.width / 2 - 12, spec.y - spec.height / 2 + 12, [this.add.circle(0, 0, 14, 0x173847, 0.9), closeIcon]).setSize(34, 34).setDepth(10).setVisible(false);
    const closeHitZone = this.add.zone(closeButton.x, closeButton.y, 36, 36).setDepth(11);
    objects.push(enterZone, closeButton, closeHitZone);

    const door: DoorView = { spec, leaf, enterZone, closeHitZone, closeButton, label, objects, open: false };
    enterZone.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.doorInteractionAt = this.time.now;
      if (door.open) this.enterDoor(door);
      else this.openDoor(door);
    });
    closeHitZone.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.doorInteractionAt = this.time.now;
      if (door.open) this.closeDoor(door);
    });
    this.doors.push(door);
  }

  private openDoor(door: DoorView): void {
    if (door.open || this.enteringDoor || !this.pet) return;
    this.doors.filter((item) => item !== door && item.open).forEach((item) => this.closeDoor(item, true));
    door.open = true;
    door.label.setText(`${door.spec.label} · 들어가기`);
    door.closeButton.setVisible(true);
    door.closeHitZone.setInteractive({ useHandCursor: true });
    this.showPointerMarker(door.spec.approachX ?? door.spec.x, door.spec.approachY);
    this.pet.walkTo(door.spec.approachX ?? door.spec.x, door.spec.approachY);
    const direction = door.spec.opensTo ?? 1;
    this.tweens.add({
      targets: door.leaf,
      x: door.spec.x + direction * door.spec.width * 0.43,
      scaleX: 0.14,
      duration: this.reducedMotion ? 1 : 280,
      ease: "Sine.easeInOut"
    });
  }

  private closeDoor(door: DoorView, immediate = false): void {
    if (!door.open && !immediate) return;
    door.open = false;
    door.closeButton.setVisible(false);
    door.closeHitZone.disableInteractive();
    door.label.setText(`${door.spec.label} · 열기`);
    this.tweens.killTweensOf(door.leaf);
    if (immediate) {
      door.leaf.setPosition(door.spec.x, door.spec.y).setScale(1);
      return;
    }
    this.tweens.add({ targets: door.leaf, x: door.spec.x, scaleX: 1, duration: this.reducedMotion ? 1 : 230, ease: "Sine.easeInOut" });
  }

  private enterDoor(door: DoorView): void {
    if (!door.open || this.enteringDoor || !this.pet) return;
    this.enteringDoor = true;
    const targetY = door.spec.y + door.spec.height * 0.28;
    const walkDuration = Phaser.Math.Clamp(this.pet.distanceTo(door.spec.x, targetY) * 3.2, 180, 900);
    this.pet.walkTo(door.spec.x, targetY, () => undefined);
    this.time.delayedCall(walkDuration, () => {
      if (!this.enteringDoor || !this.pet || !door.leaf.active) return;
      this.pet.setDepth(1.5);
      this.tweens.add({
        targets: this.pet,
        y: door.spec.y + 8,
        scaleX: 0.16,
        scaleY: 0.16,
        alpha: 0,
        duration: this.reducedMotion ? 1 : 300,
        ease: "Sine.easeIn",
        onComplete: () => gameBridge.emit("home:door-enter", { room: door.spec.destination })
      });
    });
  }

  private walkFromPointer(x: number, y: number): void {
    if (!this.pet || this.enteringDoor || !isHomeInterior(this.room)) return;
    const minY = this.room === "studio" ? 430 : 350;
    const targetX = Phaser.Math.Clamp(x, 40, 350);
    const targetY = Phaser.Math.Clamp(y, minY, 555);
    this.showPointerMarker(targetX, targetY);
    this.pet.walkTo(targetX, targetY);
  }

  private walkFromKeyboard(event: KeyboardEvent): void {
    if (!this.pet || this.enteringDoor || !isHomeInterior(this.room)) return;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-42, 0], KeyA: [-42, 0], ArrowRight: [42, 0], KeyD: [42, 0], ArrowUp: [0, -34], KeyW: [0, -34], ArrowDown: [0, 34], KeyS: [0, 34]
    };
    const direction = movement[event.code];
    if (!direction) return;
    event.preventDefault();
    const minY = this.room === "studio" ? 430 : 350;
    const targetX = Phaser.Math.Clamp(this.pet.x + direction[0], 40, 350);
    const targetY = Phaser.Math.Clamp(this.pet.y + direction[1], minY, 555);
    this.showPointerMarker(targetX, targetY);
    this.pet.walkTo(targetX, targetY);
  }

  private showPointerMarker(x: number, y: number): void {
    if (!this.pointerMarker) return;
    this.tweens.killTweensOf(this.pointerMarker);
    this.pointerMarker.setPosition(x, y).setScale(0.72).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: this.pointerMarker, scale: 1.08, alpha: 0, duration: 540, ease: "Quad.easeOut", onComplete: () => this.pointerMarker?.setVisible(false) });
  }

  private clearDoors(): void {
    for (const door of this.doors) {
      door.enterZone.removeAllListeners();
      door.closeHitZone.removeAllListeners();
      door.objects.forEach((object) => {
        this.tweens.killTweensOf(object);
        object.destroy();
      });
    }
    this.doors = [];
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

  private placePet(): void {
    if (!this.pet) return;
    const placements: Record<RoomId, { x: number; y: number; scale: number; pose: "standing" | "sleeping" }> = {
      studio: { x: 195, y: 535, scale: 0.54, pose: "standing" },
      kitchen: { x: 205, y: 500, scale: 0.5, pose: "standing" },
      wellness: { x: 306, y: 440, scale: 0.6, pose: "standing" },
      bathroom: { x: 205, y: 500, scale: 0.5, pose: "standing" },
      bedroom: { x: 205, y: 492, scale: 0.48, pose: "standing" },
      wardrobe: { x: 194, y: 505, scale: 0.5, pose: "standing" },
      "game-room": { x: 188, y: 475, scale: 0.62, pose: "standing" },
      shop: { x: 202, y: 500, scale: 0.5, pose: "standing" }
    };
    this.pet.setVisible(true).setAngle(0).setAlpha(1).setDepth(3);
    if (this.room === "wellness") {
      const oceanPlacements: Record<OceanZoneId, { x: number; y: number; scale: number; angle: number }> = {
        beach: { x: 286, y: 392, scale: 0.52, angle: 0 },
        "open-water": { x: 195, y: 323, scale: 0.42, angle: -72 },
        surf: { x: 197, y: 340, scale: 0.4, angle: -8 },
        cave: { x: 194, y: 335, scale: 0.38, angle: -12 },
        deepsea: { x: 194, y: 334, scale: 0.33, angle: 0 }
      };
      const oceanPlacement = this.oceanMode === "coastal-road" ? { x: 210, y: 390, scale: 0.45, angle: 0 } : oceanPlacements[this.oceanZone];
      this.pet.setRoomPresentation(oceanPlacement.x, oceanPlacement.y, oceanPlacement.scale, "standing");
      this.pet.setAngle(oceanPlacement.angle);
      return;
    }
    const placement = placements[this.room];
    this.pet.setRoomPresentation(placement.x, placement.y, placement.scale, placement.pose);
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
    this.clearDoors();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.roomTransition?.destroy();
    this.roomTransition = undefined;
    this.fridgeHitZone?.removeAllListeners();
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
  }
}
