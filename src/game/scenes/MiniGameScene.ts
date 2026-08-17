import Phaser from "phaser";
import type { MiniGameResult } from "../../domain/types";
import { gameBridge } from "../bridge/GameBridge";

type GameId = MiniGameResult["gameId"];

export class MiniGameScene extends Phaser.Scene {
  private gameId: GameId = "bubble-focus";
  private score = 0;
  private combo = 0;
  private health = 3;
  private startedAt = 0;
  private durationMs = 30_000;
  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private infoText?: Phaser.GameObjects.Text;
  private spawnEvent?: Phaser.Time.TimerEvent;
  private finishEvent?: Phaser.Time.TimerEvent;
  private cleanupBridge: Array<() => void> = [];
  private finished = false;
  private lanes = [90, 195, 300];
  private laneIndex = 1;
  private runner?: Phaser.GameObjects.Container;
  private runners: Phaser.GameObjects.Container[] = [];
  private pointerStart?: Phaser.Math.Vector2;
  private firstCard?: Phaser.GameObjects.Rectangle;
  private lockCards = false;
  private matchedPairs = 0;

  constructor() {
    super("minigame");
  }

  init(data: { id?: GameId }): void {
    this.gameId = data.id ?? "bubble-focus";
    this.score = 0;
    this.combo = 0;
    this.health = 3;
    this.finished = false;
    this.laneIndex = 1;
    this.runners = [];
    this.firstCard = undefined;
    this.lockCards = false;
    this.matchedPairs = 0;
  }

  create(): void {
    this.startedAt = this.time.now;
    this.cameras.main.setBackgroundColor(this.gameId === "current-run" ? "#123d5b" : "#dff5ec");
    this.add
      .text(20, 18, this.title(), { fontFamily: "system-ui", fontSize: "17px", fontStyle: "bold", color: this.gameId === "current-run" ? "#e6fff8" : "#174b57" })
      .setDepth(20);
    this.scoreText = this.add
      .text(20, 50, "점수 0", { fontFamily: "system-ui", fontSize: "14px", color: this.gameId === "current-run" ? "#bff5ec" : "#176a72" })
      .setDepth(20);
    this.timerText = this.add
      .text(370, 22, "30", { fontFamily: "system-ui", fontSize: "17px", fontStyle: "bold", color: this.gameId === "current-run" ? "#ffdc7f" : "#b76555" })
      .setOrigin(1, 0)
      .setDepth(20);
    this.infoText = this.add
      .text(195, 665, this.instruction(), { fontFamily: "system-ui", fontSize: "13px", color: this.gameId === "current-run" ? "#dffff8" : "#174b57", align: "center" })
      .setOrigin(0.5, 1)
      .setDepth(20);

    if (this.gameId === "bubble-focus") this.createBubbleFocus();
    if (this.gameId === "current-run") this.createCurrentRun();
    if (this.gameId === "reef-memory") this.createReefMemory();

    this.finishEvent = this.time.delayedCall(this.durationMs, () => this.finish(this.gameId === "reef-memory" ? this.matchedPairs >= 4 : this.score > 0));
    this.cleanupBridge = [
      gameBridge.on("minigame:pause", () => this.scene.pause()),
      gameBridge.on("minigame:resume", () => this.scene.resume()),
      gameBridge.on("minigame:restart", () => this.scene.restart({ id: this.gameId })),
      gameBridge.on("minigame:move", ({ direction }) => this.moveLane(direction)),
      gameBridge.on("minigame:demo-finish", () => {
        this.score = Math.max(this.score, 640);
        this.finish(true);
      })
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  update(time: number, delta: number): void {
    if (this.finished) return;
    const remaining = Math.max(0, Math.ceil((this.durationMs - (time - this.startedAt)) / 1000));
    this.timerText?.setText(String(remaining));
    if (this.gameId === "current-run") this.updateCurrentRun(delta, time);
  }

  private createBubbleFocus(): void {
    this.durationMs = 30_000;
    this.add.circle(195, 365, 178, 0x89dcd5, 0.2);
    const spawn = () => {
      const isDecoy = Math.random() < 0.2;
      const radius = Phaser.Math.Between(14, 32);
      const bubble = this.add
        .circle(Phaser.Math.Between(35, 355), Phaser.Math.Between(100, 610), radius, isDecoy ? 0xef8b7d : 0x58cdd0, 0.86)
        .setStrokeStyle(3, 0xffffff, 0.75)
        .setInteractive({ useHandCursor: true });
      bubble.setData("decoy", isDecoy).setData("points", Math.max(12, 48 - radius));
      bubble.on("pointerdown", () => {
        if (isDecoy) {
          this.combo = 0;
          this.infoText?.setText("산호 신호! 콤보가 초기화됐어요.");
        } else {
          this.combo += 1;
          this.score += Number(bubble.getData("points")) + Math.min(50, this.combo * 3);
          this.infoText?.setText(`${this.combo} 콤보 · 작은 물방울일수록 높은 점수`);
          this.scoreText?.setText(`점수 ${this.score}`);
        }
        this.tweens.add({ targets: bubble, scale: 1.6, alpha: 0, duration: 160, onComplete: () => bubble.destroy() });
      });
      this.tweens.add({
        targets: bubble,
        x: bubble.x + Phaser.Math.Between(-70, 70),
        y: bubble.y - Phaser.Math.Between(80, 180),
        duration: Phaser.Math.Between(1100, 2200),
        onComplete: () => bubble.destroy()
      });
    };
    spawn();
    this.spawnEvent = this.time.addEvent({ delay: 520, callback: spawn, loop: true });
  }

  private createCurrentRun(): void {
    this.durationMs = 35_000;
    this.add.rectangle(195, 360, 330, 570, 0x1e6880, 0.62);
    this.lanes.forEach((x) => this.add.line(0, 0, x, 80, x, 640, 0xc5fff1, 0.18).setOrigin(0));
    this.runner = this.add.container(this.lanes[this.laneIndex] ?? 195, 580, [
      this.add.triangle(0, 0, 0, 34, 18, 0, 36, 34, 0x67e0d0).setStrokeStyle(3, 0xffffff),
      this.add.circle(18, 13, 7, 0xffd76a)
    ]);
    this.input.keyboard?.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveLane(1));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => (this.pointerStart = new Phaser.Math.Vector2(pointer.x, pointer.y)));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerStart) return;
      const dx = pointer.x - this.pointerStart.x;
      if (Math.abs(dx) > 34) this.moveLane(dx > 0 ? 1 : -1);
      this.pointerStart = undefined;
    });
    const spawn = () => {
      const lane = Phaser.Math.Between(0, 2);
      const collectible = Math.random() > 0.58;
      const shape = collectible
        ? this.add.circle(0, 0, 13, 0xffd568).setStrokeStyle(3, 0xffffff, 0.7)
        : this.add.triangle(0, 0, -18, 18, 0, -18, 18, 18, 0xef7b72).setStrokeStyle(3, 0xffffff, 0.6);
      const object = this.add.container(this.lanes[lane] ?? 195, 80, [shape]);
      object.setData("collectible", collectible).setData("speed", 170 + (this.time.now - this.startedAt) / 110);
      this.runners.push(object);
    };
    this.spawnEvent = this.time.addEvent({ delay: 680, callback: spawn, loop: true });
    this.updateRunInfo();
  }

  private updateCurrentRun(delta: number, time: number): void {
    const speedMultiplier = 1 + Math.min(1.1, (time - this.startedAt) / 30_000);
    for (const object of [...this.runners]) {
      object.y += (Number(object.getData("speed")) * speedMultiplier * delta) / 1000;
      if (this.runner && Phaser.Math.Distance.Between(object.x, object.y, this.runner.x, this.runner.y) < 38) {
        if (object.getData("collectible")) {
          this.score += 75;
        } else {
          this.health -= 1;
          this.cameras.main.shake(130, 0.008);
          if (this.health <= 0) this.finish(this.score >= 150);
        }
        this.scoreText?.setText(`점수 ${this.score}`);
        object.destroy();
        this.runners = this.runners.filter((item) => item !== object);
        this.updateRunInfo();
      } else if (object.y > 670) {
        object.destroy();
        this.runners = this.runners.filter((item) => item !== object);
        if (!object.getData("collectible")) this.score += 12;
        this.scoreText?.setText(`점수 ${this.score}`);
      }
    }
  }

  private moveLane(direction: number): void {
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + direction, 0, 2);
    if (this.runner) this.tweens.add({ targets: this.runner, x: this.lanes[this.laneIndex], duration: 120, ease: "Sine.easeOut" });
  }

  private updateRunInfo(): void {
    this.infoText?.setText(`내구도 ${"●".repeat(Math.max(0, this.health))}${"○".repeat(Math.max(0, 3 - this.health))} · 스와이프 또는 ← →`);
  }

  private createReefMemory(): void {
    this.durationMs = 60_000;
    const symbols = Phaser.Utils.Array.Shuffle(["◉", "✦", "◇", "⌁", "⋔", "≈", "◉", "✦", "◇", "⌁", "⋔", "≈"]);
    symbols.forEach((symbol, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 90 + column * 105;
      const y = 130 + row * 118;
      const card = this.add
        .rectangle(x, y, 82, 92, 0x178796)
        .setStrokeStyle(4, 0xffffff, 0.72)
        .setInteractive({ useHandCursor: true })
        .setData("symbol", symbol)
        .setData("matched", false)
        .setData("revealed", false);
      const label = this.add
        .text(x, y, "?", { fontFamily: "system-ui", fontSize: "30px", fontStyle: "bold", color: "#f7f0d8" })
        .setOrigin(0.5)
        .setData("card-label", true);
      card.setData("label", label);
      card.on("pointerdown", () => this.flipCard(card));
    });
    this.infoText?.setText("6쌍의 해양 심볼을 찾아보세요.");
  }

  private flipCard(card: Phaser.GameObjects.Rectangle): void {
    if (this.lockCards || card.getData("matched") || card.getData("revealed")) return;
    card.setData("revealed", true).setFillStyle(0xffcf72);
    const label = card.getData("label") as Phaser.GameObjects.Text;
    label.setText(String(card.getData("symbol"))).setColor("#174b57");
    if (!this.firstCard) {
      this.firstCard = card;
      return;
    }
    const first = this.firstCard;
    this.firstCard = undefined;
    if (first.getData("symbol") === card.getData("symbol")) {
      first.setData("matched", true);
      card.setData("matched", true);
      this.matchedPairs += 1;
      this.score += 140 + Math.max(0, 60 - Math.floor((this.time.now - this.startedAt) / 1000));
      this.scoreText?.setText(`점수 ${this.score}`);
      this.infoText?.setText(`${this.matchedPairs}/6 쌍 발견`);
      if (this.matchedPairs === 6) this.finish(true);
      return;
    }
    this.lockCards = true;
    this.time.delayedCall(620, () => {
      [first, card].forEach((item) => {
        item.setData("revealed", false).setFillStyle(0x178796);
        (item.getData("label") as Phaser.GameObjects.Text).setText("?").setColor("#f7f0d8");
      });
      this.lockCards = false;
    });
  }

  private finish(success: boolean): void {
    if (this.finished) return;
    this.finished = true;
    const result: MiniGameResult = {
      gameId: this.gameId,
      score: Math.max(0, Math.min(10_000, Math.floor(this.score))),
      success,
      durationMs: Math.max(500, Math.floor(this.time.now - this.startedAt))
    };
    this.scene.pause();
    gameBridge.emit("minigame:finish", result);
  }

  private title(): string {
    return { "bubble-focus": "Bubble Focus", "current-run": "Current Run", "reef-memory": "Reef Memory" }[this.gameId];
  }

  private instruction(): string {
    if (this.gameId === "bubble-focus") return "청록 물방울을 터치하고 산호 신호는 피하세요.";
    if (this.gameId === "current-run") return "스와이프 또는 방향키로 해류 레인을 이동하세요.";
    return "같은 심볼 두 개를 연속으로 찾아보세요.";
  }

  private cleanup(): void {
    this.cleanupBridge.forEach((cleanup) => cleanup());
    this.cleanupBridge = [];
    this.spawnEvent?.destroy();
    this.finishEvent?.destroy();
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.runners.forEach((object) => object.destroy());
    this.runners = [];
  }
}
