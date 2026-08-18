import Phaser from "phaser";
import { ITEM_BY_ID } from "../../domain/catalog";
import type { WearableSlot } from "../../domain/types";
import { getRenderScale } from "../renderQuality";

const SKIN_COLORS: Record<string, number> = {
  sunrise: 0xf1b28c,
  sand: 0xd99a72,
  cocoa: 0xa96547,
  deep: 0x6d4234
};

const HAIR_COLORS: Record<string, number> = {
  midnight: 0x173847,
  coral: 0xa64f48,
  chestnut: 0x704437,
  silver: 0xa9b9bf
};

const TOUCH_LINES = ["반가워!", "오늘 바다빛이 예뻐.", "무엇부터 해볼까?", "천천히 해도 좋아."];

interface KeeperStyle {
  equipped: Record<WearableSlot, string | null>;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
}

export class Keeper extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Graphics;
  private reaction: Phaser.GameObjects.Text;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private touchIndex = 0;
  private gazeOffset = 0;
  private reducedMotion = false;
  private pose: "standing" | "sleeping" = "standing";
  private baseY: number;
  private baseScale = 1;
  private style: KeeperStyle;

  constructor(scene: Phaser.Scene, x: number, y: number, style: KeeperStyle) {
    super(scene, x, y);
    this.baseY = y;
    this.style = style;
    this.graphics = scene.add.graphics();
    this.face = scene.add.graphics();
    this.reaction = scene.add
      .text(0, -224, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#173847",
        backgroundColor: "#fffdf5",
        padding: { x: 11, y: 7 },
        align: "center",
        resolution: getRenderScale()
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.add([this.graphics, this.face, this.reaction]);
    scene.add.existing(this);
    this.setSize(150, 350).setInteractive({ useHandCursor: true });
    this.draw();
    this.on("pointerdown", () => this.touch());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearBlinkTimer());
    this.startIdle();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    this.scene.tweens.killTweensOf(this);
    this.clearBlinkTimer();
    this.setY(this.baseY).setAngle(this.baseAngle()).setScale(this.baseScale);
    this.face.clear();
    this.drawFace(this.pose === "sleeping");
    if (!value) this.startIdle();
  }

  setRoomPresentation(x: number, y: number, scale: number, pose: "standing" | "sleeping"): void {
    this.scene.tweens.killTweensOf(this);
    this.clearBlinkTimer();
    this.pose = pose;
    this.baseY = y;
    this.baseScale = scale;
    this.setPosition(x, y).setScale(scale).setAngle(this.baseAngle());
    this.draw();
    if (!this.reducedMotion) this.startIdle();
  }

  updateStyle(style: KeeperStyle): void {
    this.style = style;
    this.draw();
    this.playReaction("새 스타일이 잘 어울려!", "level");
  }

  react(action: "feed" | "wash" | "sleep" | "wellness" | "play" | "level"): void {
    const lines = {
      feed: "맛있어! 힘이 나는 것 같아.",
      wash: "거품이 구름처럼 반짝여!",
      sleep: "조금 쉬고 다시 만나자.",
      wellness: "새로운 기분으로 전환!",
      play: "한 번 더 도전해볼까?",
      level: "새로운 해역이 가까워졌어!"
    } as const;
    this.playReaction(lines[action], action);
  }

  private touch(): void {
    this.playReaction(TOUCH_LINES[this.touchIndex % TOUCH_LINES.length] ?? TOUCH_LINES[0]!, "play");
    this.touchIndex += 1;
  }

  private playReaction(text: string, action: string): void {
    this.reaction.setText(text).setAlpha(1);
    this.clearBlinkTimer();
    if (this.reducedMotion) {
      this.scene.time.delayedCall(900, () => this.reaction.setAlpha(0));
      return;
    }
    const animation = action === "sleep" ? { angle: -5, y: 8 } : action === "wash" ? { angle: 2.5, y: -7 } : { angle: 0, y: -11 };
    const baseAngle = this.baseAngle();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: this.baseY + animation.y,
      angle: baseAngle + animation.angle,
      scaleX: action === "level" ? this.baseScale * 1.045 : this.baseScale,
      scaleY: action === "level" ? this.baseScale * 1.045 : this.baseScale,
      duration: 300,
      yoyo: true,
      repeat: action === "wash" ? 2 : 0,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.setAngle(baseAngle).setScale(this.baseScale).setY(this.baseY);
        this.scene.tweens.add({ targets: this.reaction, alpha: 0, delay: 800, duration: 240 });
        this.startIdle();
      }
    });
  }

  private startIdle(): void {
    if (this.reducedMotion || !this.scene.sys.isActive()) return;
    this.scene.tweens.killTweensOf(this);
    this.clearBlinkTimer();
    this.setY(this.baseY).setAngle(this.baseAngle()).setScale(this.baseScale);
    const sleeping = this.pose === "sleeping";
    this.scene.tweens.add({
      targets: this,
      y: this.baseY - (sleeping ? 1 : 2.5),
      angle: this.baseAngle() + (sleeping ? 0.25 : 0.45),
      scaleX: this.baseScale * (sleeping ? 1.007 : 1.004),
      scaleY: this.baseScale * (sleeping ? 0.997 : 1.006),
      duration: sleeping ? 2400 : 1850,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    if (!sleeping) this.scheduleBlink();
  }

  private scheduleBlink(): void {
    this.clearBlinkTimer();
    this.blinkTimer = this.scene.time.delayedCall(1800 + Math.random() * 2600, () => this.blink());
  }

  private blink(): void {
    if (!this.active || this.reducedMotion || this.pose === "sleeping") return;
    this.face.clear();
    this.drawFace(true);
    this.blinkTimer = this.scene.time.delayedCall(115, () => {
      if (!this.active) return;
      this.gazeOffset = Phaser.Math.Between(-1, 1);
      this.face.clear();
      this.drawFace(false);
      this.scheduleBlink();
    });
  }

  private clearBlinkTimer(): void {
    this.blinkTimer?.remove(false);
    this.blinkTimer = undefined;
  }

  private draw(): void {
    this.graphics.clear();
    this.face.clear();
    const skin = SKIN_COLORS[this.style.skinTone] ?? SKIN_COLORS.sand!;
    const hair = HAIR_COLORS[this.style.hairColor] ?? HAIR_COLORS.midnight!;
    const top = this.itemColor(this.style.equipped.top, 0xe2b95a);
    const bottom = this.itemColor(this.style.equipped.bottom, 0x466a7b);
    const shoes = this.itemColor(this.style.equipped.shoes, 0xf4f0e6);

    this.graphics.fillStyle(0x173847, 0.13).fillEllipse(0, 157, 104, 18);
    this.graphics.fillStyle(bottom).fillRoundedRect(-35, 30, 29, 112, 13).fillRoundedRect(6, 30, 29, 112, 13);
    this.graphics.fillStyle(0xffffff, 0.08).fillRoundedRect(-30, 35, 6, 91, 3).fillRoundedRect(11, 35, 6, 91, 3);
    this.graphics.fillStyle(0x173847, 0.12).fillRoundedRect(-6, 34, 6, 99, 3).fillRoundedRect(35, 34, 5, 99, 3);
    this.graphics.fillStyle(shoes).fillRoundedRect(-43, 132, 40, 22, 10).fillRoundedRect(3, 132, 40, 22, 10);
    this.graphics.fillStyle(0xffffff, 0.38).fillRoundedRect(-38, 134, 29, 5, 2).fillRoundedRect(9, 134, 29, 5, 2);

    this.graphics.lineStyle(18, skin, 1).beginPath().moveTo(-48, -60).lineTo(-61, -9).lineTo(-56, 35).strokePath();
    this.graphics.lineStyle(18, skin, 1).beginPath().moveTo(48, -60).lineTo(61, -9).lineTo(56, 35).strokePath();
    this.graphics.fillStyle(skin).fillCircle(-56, 40, 11).fillCircle(56, 40, 11);
    this.graphics.fillStyle(0x6f392f, 0.1).fillEllipse(-58, 43, 12, 7).fillEllipse(58, 43, 12, 7);

    this.graphics.fillStyle(top).fillRoundedRect(-51, -75, 102, 116, 27);
    this.graphics.fillStyle(top).fillCircle(-49, -58, 18).fillCircle(49, -58, 18);
    this.graphics.fillStyle(0xffffff, 0.16).fillRoundedRect(-43, -68, 86, 28, 16);
    this.graphics.fillStyle(0x173847, 0.09).fillRoundedRect(-47, 25, 94, 15, 8);
    this.graphics.lineStyle(2.5, 0xffffff, 0.26).strokeRoundedRect(-51, -75, 102, 116, 27);
    this.graphics.fillStyle(skin).fillRoundedRect(-12, -96, 24, 27, 8);
    this.graphics.fillStyle(0x6f392f, 0.1).fillRoundedRect(-10, -78, 20, 7, 3);
    this.graphics.lineStyle(2, 0xffffff, 0.34).beginPath().arc(0, -67, 13, 0.15, Math.PI - 0.15).strokePath();

    this.graphics.fillStyle(skin).fillCircle(-47, -137, 9).fillCircle(47, -137, 9).fillEllipse(0, -137, 94, 112);
    this.graphics.fillStyle(0x7b4437, 0.1).fillEllipse(24, -130, 39, 89);
    this.graphics.fillStyle(0xffffff, 0.1).fillEllipse(-18, -154, 35, 62);
    this.drawHair(hair);
    this.drawFace(this.pose === "sleeping");

    if (this.style.equipped.accessory) {
      const accessory = ITEM_BY_ID[this.style.equipped.accessory];
      const color = Phaser.Display.Color.HexStringToColor(accessory?.color ?? "#d5f1ef").color;
      this.graphics.lineStyle(3, color, 0.94).strokeEllipse(-20, -137, 28, 19).strokeEllipse(20, -137, 28, 19).lineBetween(-6, -137, 6, -137);
    }
  }

  private drawHair(hair: number): void {
    const style = this.style.hairStyle;
    this.graphics.fillStyle(hair);
    if (style === "crop") {
      this.graphics.fillEllipse(0, -177, 96, 48).fillRoundedRect(-48, -177, 15, 43, 7).fillRoundedRect(33, -177, 15, 36, 7);
      this.graphics.fillTriangle(-38, -172, -14, -188, -4, -164).fillTriangle(-14, -176, 12, -190, 26, -164).fillTriangle(9, -177, 35, -184, 43, -158);
    } else if (style === "bun") {
      this.graphics.fillCircle(0, -202, 16).fillEllipse(-4, -207, 24, 12);
      this.graphics.fillEllipse(0, -176, 101, 52).fillRoundedRect(-50, -176, 17, 48, 8).fillRoundedRect(33, -176, 17, 48, 8);
      this.graphics.fillTriangle(-41, -172, -12, -190, 0, -162).fillTriangle(-8, -179, 20, -190, 35, -161);
    } else if (style === "curl") {
      this.graphics.fillEllipse(0, -176, 102, 54);
      [-48, -44, -47, 44, 48, 45].forEach((x, index) => this.graphics.fillCircle(x, -160 + (index % 3) * 19, 14));
      this.graphics.fillCircle(-35, -183, 16).fillCircle(-12, -190, 16).fillCircle(13, -190, 16).fillCircle(36, -182, 16);
    } else {
      this.graphics.fillEllipse(0, -177, 104, 55).fillRoundedRect(-51, -177, 18, 53, 9).fillRoundedRect(33, -177, 18, 53, 9);
      this.graphics.fillCircle(-44, -145, 12).fillCircle(43, -145, 12);
      this.graphics.fillTriangle(-43, -176, -17, -194, -2, -166).fillTriangle(-18, -181, 9, -195, 25, -165).fillTriangle(8, -181, 36, -190, 44, -158);
    }
    this.graphics.fillStyle(0xffffff, 0.09).fillEllipse(-17, -188, 48, 13);
  }

  private drawFace(blinking: boolean): void {
    const sleeping = blinking || this.pose === "sleeping";
    this.face.lineStyle(2.4, 0x573a36, 0.88);
    this.face.beginPath().moveTo(-31, -151).lineTo(-15, -154).strokePath();
    this.face.beginPath().moveTo(15, -154).lineTo(31, -151).strokePath();
    if (sleeping) {
      this.face.beginPath().arc(-22, -137, 8, 0.16, Math.PI - 0.16).strokePath();
      this.face.beginPath().arc(22, -137, 8, 0.16, Math.PI - 0.16).strokePath();
    } else {
      this.face.fillStyle(0xfffdf6, 0.86).fillEllipse(-22, -138, 14, 8).fillEllipse(22, -138, 14, 8);
      this.face.fillStyle(0x36535a).fillCircle(-22 + this.gazeOffset, -138, 3.4).fillCircle(22 + this.gazeOffset, -138, 3.4);
      this.face.fillStyle(0x152f38).fillCircle(-22 + this.gazeOffset, -138, 1.8).fillCircle(22 + this.gazeOffset, -138, 1.8);
      this.face.fillStyle(0xffffff, 0.9).fillCircle(-21 + this.gazeOffset, -139, 0.9).fillCircle(23 + this.gazeOffset, -139, 0.9);
    }
    this.face.lineStyle(2, 0x8a574c, 0.64).beginPath().moveTo(1, -135).lineTo(-2, -122).lineTo(4, -120).strokePath();
    this.face.fillStyle(0xe67f78, 0.18).fillEllipse(-34, -119, 18, 8).fillEllipse(34, -119, 18, 8);
    this.face.lineStyle(2.6, 0x914940, 0.95).beginPath().arc(0, -111, 13, 0.22, Math.PI - 0.22).strokePath();
    this.face.lineStyle(1, 0xffffff, 0.35).lineBetween(-7, -105, 7, -105);
  }

  private baseAngle(): number {
    return this.pose === "sleeping" ? -78 : 0;
  }

  private itemColor(id: string | null, fallback: number): number {
    const color = id ? ITEM_BY_ID[id]?.color : undefined;
    return color ? Phaser.Display.Color.HexStringToColor(color).color : fallback;
  }
}
