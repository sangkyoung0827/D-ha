import Phaser from "phaser";
import { ITEM_BY_ID } from "../../domain/catalog";
import {
  COLLAR_COLORS,
  OUTFIT_COLORS,
  breedDefinition,
  furColorValue,
  petAccentColor,
  type PetAccessory,
  type PetAnimation,
  type PetAppearance
} from "../../domain/pet";
import type { WearableSlot } from "../../domain/types";
import { getRenderScale } from "../renderQuality";

const TOUCH_LINES = ["멍! 반가워!", "바다 냄새가 좋아.", "어디로 가볼까?", "곁에 있어 줘서 좋아."];

export interface PetCharacterStyle extends PetAppearance {
  equipped: Record<WearableSlot, string | null>;
}

export class PetCharacter extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Graphics;
  private reaction: Phaser.GameObjects.Text;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private touchIndex = 0;
  private reducedMotion = false;
  private animation: PetAnimation = "idle";
  private baseY: number;
  private baseScale = 1;
  private style: PetCharacterStyle;

  constructor(scene: Phaser.Scene, x: number, y: number, style: PetCharacterStyle) {
    super(scene, x, y);
    this.baseY = y;
    this.style = style;
    this.graphics = scene.add.graphics();
    this.face = scene.add.graphics();
    this.reaction = scene.add.text(0, -151, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#173847",
      backgroundColor: "#fffdf5",
      padding: { x: 11, y: 7 },
      align: "center",
      resolution: getRenderScale()
    }).setOrigin(0.5).setAlpha(0);
    this.add([this.graphics, this.face, this.reaction]);
    scene.add.existing(this);
    this.setSize(190, 235).setInteractive({ useHandCursor: true });
    this.draw();
    this.on("pointerdown", () => this.touch());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearBlinkTimer());
    this.startIdle();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    this.scene.tweens.killTweensOf(this);
    this.clearBlinkTimer();
    this.resetTransform();
    if (!value) this.startIdle();
  }

  setRoomPresentation(x: number, y: number, scale: number, pose: "standing" | "sleeping"): void {
    this.scene.tweens.killTweensOf(this);
    this.clearBlinkTimer();
    this.animation = pose === "sleeping" ? "sleep" : "idle";
    this.baseY = y;
    this.baseScale = scale;
    this.setPosition(x, y).setScale(scale).setAngle(pose === "sleeping" ? -12 : 0).setAlpha(1);
    this.draw();
    if (!this.reducedMotion) this.startIdle();
  }

  updateStyle(style: PetCharacterStyle): void {
    this.style = style;
    this.draw();
    this.playReaction("새 스타일이 잘 어울려!", "happy");
  }

  walkTo(x: number, y: number, onComplete?: () => void): void {
    this.scene.tweens.killTweensOf(this);
    this.clearBlinkTimer();
    this.animation = "walk";
    const distance = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    const duration = Phaser.Math.Clamp(distance * 3.2, 180, 900);
    const startScale = this.baseScale;
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        if (this.reducedMotion) return;
        const phase = tween.progress * Math.PI * Math.max(2, Math.round(distance / 15));
        this.setAngle(Math.sin(phase) * 2.2);
        this.setScale(startScale * (1 + Math.abs(Math.sin(phase)) * 0.025), startScale * (1 - Math.abs(Math.sin(phase)) * 0.02));
      },
      onComplete: () => {
        this.baseY = y;
        this.animation = "idle";
        this.resetTransform();
        onComplete?.();
        if (!onComplete && this.active && this.scene.sys.isActive()) this.startIdle();
      }
    });
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.x, this.y, x, y);
  }

  react(action: "feed" | "wash" | "sleep" | "wellness" | "play" | "level"): void {
    const reaction = {
      feed: ["냠냠, 맛있어!", "eat"],
      wash: ["보송보송해졌어!", "wash"],
      sleep: ["포근하게 잘게.", "sleep"],
      wellness: ["기운이 돌아왔어!", "happy"],
      play: ["같이 뛰어놀자!", "jump"],
      level: ["새로운 해역이다!", "happy"]
    } as const;
    const [text, animation] = reaction[action];
    this.playReaction(text, animation);
  }

  private touch(): void {
    this.playReaction(TOUCH_LINES[this.touchIndex % TOUCH_LINES.length] ?? TOUCH_LINES[0]!, "happy");
    this.touchIndex += 1;
  }

  private playReaction(text: string, animation: PetAnimation): void {
    this.animation = animation;
    this.reaction.setText(text).setAlpha(1);
    this.clearBlinkTimer();
    this.draw();
    if (this.reducedMotion) {
      this.scene.time.delayedCall(900, () => { this.reaction.setAlpha(0); this.animation = "idle"; this.draw(); });
      return;
    }
    const target = animation === "sleep" ? { y: 8, angle: -12, scale: 0.98 } : animation === "wash" ? { y: -3, angle: 4, scale: 1 } : { y: -13, angle: 0, scale: 1.04 };
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: this.baseY + target.y,
      angle: target.angle,
      scaleX: this.baseScale * target.scale,
      scaleY: this.baseScale * target.scale,
      duration: animation === "sleep" ? 520 : 260,
      yoyo: animation !== "sleep",
      repeat: animation === "wash" ? 3 : 0,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.animation = animation === "sleep" ? "sleep" : "idle";
        this.resetTransform();
        this.scene.tweens.add({ targets: this.reaction, alpha: 0, delay: 700, duration: 220 });
        this.draw();
        this.startIdle();
      }
    });
  }

  private startIdle(): void {
    if (this.reducedMotion || !this.scene.sys.isActive()) return;
    this.scene.tweens.killTweensOf(this);
    this.clearBlinkTimer();
    const sleeping = this.animation === "sleep";
    this.scene.tweens.add({
      targets: this,
      y: this.baseY - (sleeping ? 1 : 2.5),
      angle: sleeping ? -11 : 0.7,
      scaleX: this.baseScale * (sleeping ? 1.012 : 1.006),
      scaleY: this.baseScale * (sleeping ? 0.995 : 1.008),
      duration: sleeping ? 2300 : 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    if (!sleeping) this.scheduleBlink();
  }

  private scheduleBlink(): void {
    this.clearBlinkTimer();
    this.blinkTimer = this.scene.time.delayedCall(1800 + Math.random() * 2500, () => {
      this.draw(true);
      this.blinkTimer = this.scene.time.delayedCall(120, () => { this.draw(false); this.scheduleBlink(); });
    });
  }

  private clearBlinkTimer(): void {
    this.blinkTimer?.remove(false);
    this.blinkTimer = undefined;
  }

  private resetTransform(): void {
    this.setY(this.baseY).setAngle(this.animation === "sleep" ? -12 : 0).setScale(this.baseScale);
  }

  private draw(blinking = false): void {
    this.graphics.clear();
    this.face.clear();
    const breed = breedDefinition(this.style.breed);
    const fur = this.color(furColorValue(this.style.furColor));
    const accent = this.color(petAccentColor(this.style));
    const outfitItem = this.style.equipped.top ? ITEM_BY_ID[this.style.equipped.top]?.color : undefined;
    const outfit = this.color(outfitItem ?? (this.style.outfit === "none" ? furColorValue(this.style.furColor) : OUTFIT_COLORS[this.style.outfit]));
    const bottomItem = this.style.equipped.bottom ? ITEM_BY_ID[this.style.equipped.bottom]?.color : undefined;
    const shoesItem = this.style.equipped.shoes ? ITEM_BY_ID[this.style.equipped.shoes]?.color : undefined;
    const large = breed.size === "large" ? 1.15 : breed.size === "small" ? 0.92 : 1;
    const fluffy = breed.coat === "curly" || breed.coat === "fluffy" || breed.coat === "long";
    const sleeping = this.animation === "sleep";

    this.graphics.fillStyle(0x173847, 0.14).fillEllipse(0, 91, 132 * large, 20);
    this.drawTail(fur, accent);
    this.graphics.fillStyle(outfit).fillRoundedRect(-51 * large, -8, 102 * large, 82, 34);
    this.graphics.lineStyle(2.5, 0xffffff, 0.28).strokeRoundedRect(-51 * large, -8, 102 * large, 82, 34);
    this.graphics.fillStyle(fur).fillRoundedRect(-45 * large, -12, 90 * large, 80, 35);
    if (this.style.outfit !== "none" || outfitItem) this.graphics.fillStyle(outfit).fillRoundedRect(-49 * large, 18, 98 * large, 53, 24);
    if (bottomItem) this.graphics.fillStyle(this.color(bottomItem), 0.92).fillRoundedRect(-47 * large, 48, 94 * large, 25, 12);
    for (const x of [-30, 30]) {
      this.graphics.fillStyle(fur).fillRoundedRect(x - 13, 52, 26, 38, 12);
      this.graphics.fillStyle(accent, this.style.pattern === "points" ? 0.86 : 0.13).fillRoundedRect(x - 13, 76, 26, 14, 8);
      if (shoesItem) this.graphics.fillStyle(this.color(shoesItem), 0.96).fillRoundedRect(x - 15, 76, 30, 15, 8);
    }

    if (fluffy) {
      for (let index = 0; index < 12; index += 1) {
        const angle = (index / 12) * Math.PI * 2;
        this.graphics.fillStyle(fur).fillCircle(Math.cos(angle) * 48, -35 + Math.sin(angle) * 43, 17);
      }
    }
    this.drawEars(fur, accent);
    this.graphics.fillStyle(fur).fillEllipse(0, -36, 104, 96);
    this.graphics.fillStyle(0xffffff, 0.12).fillEllipse(-20, -50, 34, 48);
    this.drawPattern(accent);
    this.graphics.fillStyle(this.color("#f8f1e7"), 0.66).fillEllipse(0, -13, breed.muzzle === "long" ? 58 : 49, breed.muzzle === "long" ? 38 : 32);

    if (this.style.collar !== "none") {
      this.graphics.lineStyle(10, this.color(COLLAR_COLORS[this.style.collar]), 1).beginPath().arc(0, 7, 42, 0.25, Math.PI - 0.25).strokePath();
      this.graphics.fillStyle(0xf1c959).fillCircle(0, 11, 6);
    }
    this.drawHat();
    this.drawAccessory(this.style.accessory !== "none" ? this.style.accessory : this.style.equipped.accessory ? "round" : "none");
    this.drawFace(blinking || sleeping);
  }

  private drawEars(fur: number, accent: number): void {
    const breed = breedDefinition(this.style.breed);
    if (breed.ears === "pointed") {
      this.graphics.fillStyle(fur).fillTriangle(-44, -61, -26, -104, -11, -68).fillTriangle(44, -61, 26, -104, 11, -68);
      this.graphics.fillStyle(accent, 0.55).fillTriangle(-38, -66, -27, -92, -18, -70).fillTriangle(38, -66, 27, -92, 18, -70);
    } else if (breed.ears === "drop") {
      this.graphics.fillStyle(fur).fillRoundedRect(-65, -68, 31, 69, 15).fillRoundedRect(34, -68, 31, 69, 15);
      this.graphics.fillStyle(accent, 0.18).fillRoundedRect(-59, -57, 16, 47, 8).fillRoundedRect(43, -57, 16, 47, 8);
    } else {
      this.graphics.fillStyle(fur).fillTriangle(-45, -64, -30, -91, -13, -67).fillTriangle(45, -64, 30, -91, 13, -67);
    }
  }

  private drawPattern(accent: number): void {
    if (this.style.pattern === "solid") return;
    this.graphics.fillStyle(accent, this.style.pattern === "points" ? 0.82 : 0.72);
    if (this.style.pattern === "bicolor") this.graphics.fillEllipse(-20, -50, 42, 60);
    if (this.style.pattern === "points") this.graphics.fillEllipse(0, -35, 70, 57);
    if (this.style.pattern === "tabby") {
      this.graphics.fillRoundedRect(-5, -78, 10, 29, 5).fillRoundedRect(-22, -74, 8, 24, 4).fillRoundedRect(14, -74, 8, 24, 4);
    }
    if (this.style.pattern === "spotted") this.graphics.fillCircle(-28, -55, 12).fillCircle(30, -25, 10).fillCircle(7, -68, 7);
  }

  private drawTail(fur: number, accent: number): void {
    this.graphics.lineStyle(this.style.species === "cat" ? 16 : 22, fur, 1).beginPath().arc(48, 26, this.style.species === "cat" ? 50 : 36, -1.6, 0.45).strokePath();
    if (this.style.pattern === "points") this.graphics.lineStyle(10, accent, 0.9).beginPath().arc(48, 26, this.style.species === "cat" ? 50 : 36, -0.2, 0.45).strokePath();
  }

  private drawHat(): void {
    if (this.style.hat === "none") return;
    const colors = { cap: 0x3b8490, beanie: 0xef7c6e, sunhat: 0xe5c270 } as const;
    const color = colors[this.style.hat];
    this.graphics.fillStyle(color).fillEllipse(0, -83, this.style.hat === "sunhat" ? 112 : 75, this.style.hat === "beanie" ? 43 : 25);
    if (this.style.hat === "cap") this.graphics.fillRoundedRect(18, -79, 47, 9, 4);
    if (this.style.hat === "beanie") this.graphics.fillCircle(0, -108, 8);
  }

  private drawAccessory(accessory: PetAccessory): void {
    if (accessory === "none") return;
    if (accessory === "bandana") {
      this.graphics.fillStyle(0xef7c6e).fillTriangle(-37, 5, 37, 5, 0, 48);
      return;
    }
    const tinted = accessory === "sunglasses";
    this.graphics.lineStyle(3, 0x294954).lineBetween(-7, -40, 7, -40);
    if (accessory === "square") {
      this.graphics.fillStyle(0x183744, tinted ? 0.7 : 0.08).fillRoundedRect(-39, -51, 31, 23, 5).fillRoundedRect(8, -51, 31, 23, 5);
      this.graphics.strokeRoundedRect(-39, -51, 31, 23, 5).strokeRoundedRect(8, -51, 31, 23, 5);
    } else {
      this.graphics.fillStyle(0x183744, tinted ? 0.72 : 0.08).fillEllipse(-23, -40, 31, 24).fillEllipse(23, -40, 31, 24);
      this.graphics.strokeEllipse(-23, -40, 31, 24).strokeEllipse(23, -40, 31, 24);
    }
  }

  private drawFace(closed: boolean): void {
    this.face.lineStyle(2.6, 0x233d45, 0.95);
    if (closed) {
      this.face.beginPath().arc(-23, -39, 7, 0.15, Math.PI - 0.15).strokePath();
      this.face.beginPath().arc(23, -39, 7, 0.15, Math.PI - 0.15).strokePath();
    } else {
      this.face.fillStyle(0x233d45).fillEllipse(-23, -40, 8, 11).fillEllipse(23, -40, 8, 11);
      this.face.fillStyle(0xffffff, 0.92).fillCircle(-21, -43, 1.7).fillCircle(25, -43, 1.7);
    }
    this.face.fillStyle(0x3e3534).fillEllipse(0, -17, 13, 9);
    this.face.lineStyle(2.1, 0x8d514b).beginPath().arc(-7, -9, 7, 0.05, 1.45).strokePath().beginPath().arc(7, -9, 7, 1.7, 3.08).strokePath();
    if (this.animation === "happy" || this.animation === "jump") this.face.fillStyle(0xe7837d).fillEllipse(0, 0, 14, 10);
  }

  private color(value: string): number {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }
}
