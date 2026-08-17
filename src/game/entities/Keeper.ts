import Phaser from "phaser";
import { ITEM_BY_ID } from "../../domain/catalog";
import type { WearableSlot } from "../../domain/types";

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

export class Keeper extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Graphics;
  private reaction: Phaser.GameObjects.Text;
  private touchIndex = 0;
  private reducedMotion = false;
  private style: { equipped: Record<WearableSlot, string | null>; skinTone: string; hairColor: string };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    style: { equipped: Record<WearableSlot, string | null>; skinTone: string; hairColor: string }
  ) {
    super(scene, x, y);
    this.style = style;
    this.graphics = scene.add.graphics();
    this.face = scene.add.graphics();
    this.reaction = scene.add
      .text(0, -208, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#173847",
        backgroundColor: "#fffdf5",
        padding: { x: 12, y: 8 },
        align: "center"
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.add([this.graphics, this.face, this.reaction]);
    scene.add.existing(this);
    this.setSize(180, 330).setInteractive({ useHandCursor: true });
    this.draw();
    this.on("pointerdown", () => this.touch());
    this.startIdle();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) this.scene.tweens.killTweensOf(this);
    else this.startIdle();
  }

  updateStyle(style: typeof this.style): void {
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
    if (this.reducedMotion) {
      this.scene.time.delayedCall(900, () => this.reaction.setAlpha(0));
      return;
    }
    const animation = action === "sleep" ? { angle: -7, y: 12 } : action === "wash" ? { angle: 4, y: -10 } : { angle: 0, y: -18 };
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: this.y + animation.y,
      angle: animation.angle,
      scaleX: action === "level" ? 1.08 : 1,
      scaleY: action === "level" ? 1.08 : 1,
      duration: 260,
      yoyo: true,
      repeat: action === "wash" ? 2 : 0,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.setAngle(0).setScale(1);
        this.scene.tweens.add({ targets: this.reaction, alpha: 0, delay: 800, duration: 240 });
        this.startIdle();
      }
    });
  }

  private startIdle(): void {
    if (this.reducedMotion || !this.scene.sys.isActive()) return;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, y: this.y - 5, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.scene.time.delayedCall(1600 + Math.random() * 1800, () => this.blink());
  }

  private blink(): void {
    if (!this.active || this.reducedMotion) return;
    this.face.clear();
    this.drawFace(true);
    this.scene.time.delayedCall(110, () => {
      if (!this.active) return;
      this.face.clear();
      this.drawFace(false);
    });
  }

  private draw(): void {
    this.graphics.clear();
    this.face.clear();
    const skin = SKIN_COLORS[this.style.skinTone] ?? SKIN_COLORS.sand!;
    const hair = HAIR_COLORS[this.style.hairColor] ?? HAIR_COLORS.midnight!;
    const top = this.itemColor(this.style.equipped.top, 0xf4c95d);
    const bottom = this.itemColor(this.style.equipped.bottom, 0x4d7180);
    const shoes = this.itemColor(this.style.equipped.shoes, 0xf4f0e6);

    this.graphics.fillStyle(0x173847, 0.16).fillEllipse(0, 154, 124, 24);
    this.graphics.fillStyle(shoes).fillRoundedRect(-58, 128, 50, 22, 10).fillRoundedRect(8, 128, 50, 22, 10);
    this.graphics.fillStyle(bottom).fillRoundedRect(-50, 38, 42, 100, 18).fillRoundedRect(8, 38, 42, 100, 18);
    this.graphics.fillStyle(top).fillRoundedRect(-68, -68, 136, 125, 34);
    this.graphics.lineStyle(5, 0xffffff, 0.35).strokeRoundedRect(-68, -68, 136, 125, 34);
    this.graphics.fillStyle(skin).fillRoundedRect(-91, -54, 27, 92, 13).fillRoundedRect(64, -54, 27, 92, 13);
    this.graphics.fillStyle(skin).fillCircle(0, -122, 67);
    this.graphics.fillStyle(hair).fillEllipse(0, -151, 132, 78);
    this.graphics.fillTriangle(-64, -145, -38, -193, -12, -164);
    this.drawFace(false);

    if (this.style.equipped.accessory) {
      const accessory = ITEM_BY_ID[this.style.equipped.accessory];
      this.graphics.lineStyle(5, Phaser.Display.Color.HexStringToColor(accessory?.color ?? "#d5f1ef").color, 0.9);
      this.graphics.strokeCircle(-25, -124, 18).strokeCircle(25, -124, 18).lineBetween(-7, -124, 7, -124);
    }
  }

  private drawFace(blinking: boolean): void {
    this.face.lineStyle(5, 0x173847, 1);
    if (blinking) {
      this.face.lineBetween(-34, -124, -17, -124).lineBetween(17, -124, 34, -124);
    } else {
      this.face.fillStyle(0x173847).fillCircle(-25, -124, 6).fillCircle(25, -124, 6);
    }
    this.face.lineStyle(4, 0x994d45, 1).beginPath().arc(0, -100, 17, 0.2, Math.PI - 0.2).strokePath();
  }

  private itemColor(id: string | null, fallback: number): number {
    const color = id ? ITEM_BY_ID[id]?.color : undefined;
    return color ? Phaser.Display.Color.HexStringToColor(color).color : fallback;
  }
}
