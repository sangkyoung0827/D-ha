import Phaser from "phaser";
import type { MiniGameResult } from "../../domain/types";
import { OCEAN_GAME_BY_ID } from "../../domain/ocean";
import { gameBridge } from "../bridge/GameBridge";
import { applyHighDpiCamera } from "../renderQuality";

type GameId = MiniGameResult["gameId"];

interface AthleteProfile {
  name: string;
  skin: number;
  hair: number;
  shirt: number;
  hairStyle: "wave" | "crop" | "bun" | "curl";
}

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
  private timingObject?: Phaser.GameObjects.Arc;
  private timingPhase = 0;
  private sportBall?: Phaser.GameObjects.Arc;
  private sportHitTarget?: Phaser.GameObjects.Arc;
  private sportHitGlow?: Phaser.GameObjects.Arc;
  private playerAthlete?: Phaser.GameObjects.Container;
  private computerAthlete?: Phaser.GameObjects.Container;
  private sportPhase: "waiting" | "to-player" | "to-computer" | "football-ready" | "football-shot" = "waiting";
  private sportVelocity = new Phaser.Math.Vector2();
  private nextSportServeAt = 0;
  private playerPoints = 0;
  private computerPoints = 0;
  private sportAttempts = 0;
  private computerSkill = 0.78;
  private swimmer?: Phaser.GameObjects.Container;
  private swimTarget = new Phaser.Math.Vector2(195, 365);
  private catches = 0;

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
    this.timingObject = undefined;
    this.timingPhase = 0;
    this.sportBall = undefined;
    this.sportHitTarget = undefined;
    this.sportHitGlow = undefined;
    this.playerAthlete = undefined;
    this.computerAthlete = undefined;
    this.sportPhase = "waiting";
    this.sportVelocity.set(0, 0);
    this.nextSportServeAt = 0;
    this.playerPoints = 0;
    this.computerPoints = 0;
    this.sportAttempts = 0;
    this.computerSkill = Phaser.Math.FloatBetween(0.72, 0.88);
    this.swimmer = undefined;
    this.swimTarget.set(195, 365);
    this.catches = 0;
  }

  create(): void {
    const renderScale = applyHighDpiCamera(this);
    this.startedAt = this.time.now;
    const darkGame = this.gameId === "current-run" || this.gameId === "reef-surf" || this.gameId === "cave-sonar" || this.gameId === "deepsea-descent";
    this.cameras.main.setBackgroundColor(darkGame ? "#102d4d" : "#dff5ec");
    this.add
      .text(20, 18, this.title(), { fontFamily: "system-ui", fontSize: "17px", fontStyle: "bold", color: darkGame ? "#e6fff8" : "#174b57", resolution: renderScale })
      .setDepth(20);
    this.scoreText = this.add
      .text(20, 50, "점수 0", { fontFamily: "system-ui", fontSize: "14px", color: darkGame ? "#bff5ec" : "#176a72", resolution: renderScale })
      .setDepth(20);
    this.timerText = this.add
      .text(370, 22, "30", { fontFamily: "system-ui", fontSize: "17px", fontStyle: "bold", color: darkGame ? "#ffdc7f" : "#b76555", resolution: renderScale })
      .setOrigin(1, 0)
      .setDepth(20);
    this.infoText = this.add
      .text(195, 665, this.instruction(), { fontFamily: "system-ui", fontSize: "13px", color: darkGame ? "#dffff8" : "#174b57", align: "center", resolution: renderScale })
      .setOrigin(0.5, 1)
      .setDepth(20);

    if (this.gameId === "bubble-focus") this.createBubbleFocus();
    if (this.gameId === "current-run") this.createCurrentRun();
    if (this.gameId === "reef-memory") this.createReefMemory();
    if (this.gameId === "beach-volleyball" || this.gameId === "beach-pingpong" || this.gameId === "beach-football") this.createBeachSport();
    if (this.gameId === "open-water-catch") this.createOpenWaterCatch();
    if (this.gameId === "reef-surf" || this.gameId === "deepsea-descent") this.createCurrentRun();
    if (this.gameId === "cave-sonar") this.createReefMemory();

    this.finishEvent = this.time.delayedCall(this.durationMs, () => this.finish(this.successAtTimeout()));
    this.cleanupBridge = [
      gameBridge.on("minigame:pause", () => this.scene.pause()),
      gameBridge.on("minigame:resume", () => this.scene.resume()),
      gameBridge.on("minigame:restart", () => this.scene.restart({ id: this.gameId })),
      gameBridge.on("minigame:move", ({ direction }) => this.moveLane(direction)),
      gameBridge.on("minigame:action", () => this.performPrimaryAction()),
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
    if (this.gameId === "current-run" || this.gameId === "reef-surf" || this.gameId === "deepsea-descent") this.updateCurrentRun(delta, time);
    if (this.gameId === "beach-volleyball" || this.gameId === "beach-pingpong") this.updateRallySport(delta);
    if (this.gameId === "beach-football") this.updateFootball(time);
    if (this.gameId === "open-water-catch") this.updateOpenWater(delta);
  }

  private createBeachSport(): void {
    this.durationMs = 30_000;
    this.drawBeachArena();
    if (this.gameId === "beach-football") this.createFootballMatch();
    else this.createRallyMatch();
    this.input.keyboard?.on("keydown-SPACE", () => this.performPrimaryAction());
  }

  private drawBeachArena(): void {
    this.add.rectangle(195, 205, 390, 360, 0x76d7dc);
    this.add.circle(315, 104, 31, 0xffd36f);
    this.add.ellipse(92, 121, 142, 30, 0xffffff, 0.48);
    this.add.ellipse(286, 151, 111, 24, 0xffffff, 0.36);
    this.add.rectangle(195, 514, 390, 372, 0xf1d091);
    this.add.ellipse(195, 430, 430, 90, 0xffedbd, 0.8);
    for (let x = 16; x < 390; x += 56) this.add.line(0, 0, x, 430, x + 34, 660, 0xcda96e, 0.11).setOrigin(0);
  }

  private createRallyMatch(): void {
    const pingPong = this.gameId === "beach-pingpong";
    if (pingPong) {
      this.add.polygon(195, 397, [73, -68, 317, -68, 355, 82, 35, 82], 0x248e86).setStrokeStyle(4, 0xffffff, 0.84).setDepth(3);
      this.add.line(0, 0, 195, 326, 195, 479, 0xffffff, 0.8).setOrigin(0).setDepth(4);
      this.add.rectangle(195, 397, 318, 6, 0xe9f7ef).setDepth(5);
      this.add.line(0, 0, 80, 479, 66, 558, 0x526462, 0.75).setOrigin(0);
      this.add.line(0, 0, 310, 479, 324, 558, 0x526462, 0.75).setOrigin(0);
    } else {
      this.add.rectangle(195, 371, 350, 205, 0xffffff, 0.04).setStrokeStyle(3, 0xffffff, 0.64).setDepth(2);
      this.add.rectangle(195, 370, 350, 7, 0xf7f4de).setDepth(5);
      for (let x = 28; x < 366; x += 26) this.add.line(0, 0, x, 337, x, 403, 0x97b5a7, 0.55).setOrigin(0).setDepth(4);
    }

    const opponent = this.randomOpponentProfile();
    this.computerAthlete = this.createAthlete(195, pingPong ? 272 : 278, pingPong ? 0.72 : 0.78, opponent, true).setDepth(pingPong ? 2 : 4);
    this.playerAthlete = this.createAthlete(195, pingPong ? 550 : 556, pingPong ? 0.9 : 0.94, this.playerProfile(), false).setDepth(8);
    this.sportBall = this.add.circle(195, pingPong ? 305 : 310, pingPong ? 9 : 15, pingPong ? 0xffffff : 0xffc85f)
      .setStrokeStyle(3, pingPong ? 0xffbb5b : 0xffffff, 0.94)
      .setDepth(13)
      .setVisible(false);
    this.sportHitTarget = this.add.circle(195, 305, pingPong ? 38 : 40, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(14);
    this.sportHitGlow = this.add.circle(195, 305, pingPong ? 27 : 34, pingPong ? 0xffcc69 : 0xffffff, 0.08)
      .setStrokeStyle(3, pingPong ? 0xffcc69 : 0xffffff, 0.8)
      .setDepth(12)
      .setVisible(false);
    this.sportHitTarget.on("pointerdown", () => this.attemptRallyHit());
    this.nextSportServeAt = this.time.now + 650;
    this.sportPhase = "waiting";
    this.updateSportScore();
    this.infoText?.setText(`${opponent.name} COM · 날아오는 ${pingPong ? "탁구공" : "공"}이 빛나면 공을 터치하세요.`);
  }

  private updateRallySport(delta: number): void {
    if (!this.sportBall || !this.sportHitTarget) return;
    if (this.sportPhase === "waiting" && this.time.now >= this.nextSportServeAt) this.serveRallyBall();
    if (this.sportPhase !== "to-player" && this.sportPhase !== "to-computer") return;
    this.sportBall.x += this.sportVelocity.x * delta / 1000;
    this.sportBall.y += this.sportVelocity.y * delta / 1000;
    this.sportHitTarget.setPosition(this.sportBall.x, this.sportBall.y);
    const hitStart = this.gameId === "beach-pingpong" ? 430 : 420;
    const hitEnd = 570;
    const hittable = this.sportPhase === "to-player" && this.sportBall.y >= hitStart && this.sportBall.y <= hitEnd;
    this.sportHitGlow?.setPosition(this.sportBall.x, this.sportBall.y).setVisible(hittable);
    if (hittable && this.sportHitGlow) this.sportHitGlow.setScale(1 + Math.sin(this.time.now / 75) * 0.12);
    if (this.sportPhase === "to-player" && this.sportBall.y > hitEnd + 28) this.endRally(false, "공을 놓쳤어요. COM 득점");
    if (this.sportPhase === "to-computer" && this.sportBall.y < (this.gameId === "beach-pingpong" ? 305 : 300)) this.computerReturn();
  }

  private serveRallyBall(): void {
    if (!this.sportBall) return;
    const pingPong = this.gameId === "beach-pingpong";
    this.combo = 0;
    this.sportPhase = "to-player";
    this.sportBall.setPosition(this.computerAthlete?.x ?? 195, pingPong ? 305 : 300).setVisible(true);
    const targetX = Phaser.Math.Between(pingPong ? 132 : 110, pingPong ? 258 : 280);
    const speed = pingPong ? 285 : 252;
    this.sportVelocity.set((targetX - this.sportBall.x) / 0.9, speed);
    this.swingAthlete(this.computerAthlete, true);
    this.infoText?.setText("COM 서브 · 공이 빛나는 순간 공을 터치하세요!");
  }

  private attemptRallyHit(): void {
    if (!this.sportBall || this.sportPhase !== "to-player") return;
    const hitStart = this.gameId === "beach-pingpong" ? 430 : 420;
    const hitEnd = 570;
    if (this.sportBall.y < hitStart || this.sportBall.y > hitEnd) {
      this.infoText?.setText("조금 더 기다렸다가 빛나는 공을 터치하세요.");
      return;
    }
    const center = (hitStart + hitEnd) / 2;
    const accuracy = Math.abs(this.sportBall.y - center);
    const points = Math.max(45, 128 - Math.floor(accuracy * 1.7)) + Math.min(90, this.combo * 9);
    this.combo += 1;
    this.score += points;
    this.sportPhase = "to-computer";
    const targetX = Phaser.Math.Between(115, 275);
    const speed = Math.min(390, (this.gameId === "beach-pingpong" ? 300 : 270) + this.combo * 12);
    this.sportVelocity.set((targetX - this.sportBall.x) / 0.78, -speed);
    this.swingAthlete(this.playerAthlete, false);
    this.tweens.add({ targets: this.playerAthlete, x: Phaser.Math.Clamp(this.sportBall.x, 132, 258), duration: 130, yoyo: true, ease: "Sine.easeOut" });
    this.infoText?.setText(`${this.combo} 랠리 · 정확한 리턴 +${points}`);
    this.updateSportScore();
  }

  private computerReturn(): void {
    if (!this.sportBall) return;
    this.swingAthlete(this.computerAthlete, true);
    this.tweens.add({ targets: this.computerAthlete, x: Phaser.Math.Clamp(this.sportBall.x, 132, 258), duration: 120, yoyo: true, ease: "Sine.easeOut" });
    const returnChance = this.combo < 2 ? 1 : Math.max(0.52, this.computerSkill - this.combo * 0.025);
    if (Math.random() > returnChance) {
      this.endRally(true, "COM이 놓쳤어요. 내 득점!");
      return;
    }
    this.sportPhase = "to-player";
    const targetX = Phaser.Math.Between(112, 278);
    const speed = Math.min(405, (this.gameId === "beach-pingpong" ? 292 : 258) + this.combo * 13);
    this.sportVelocity.set((targetX - this.sportBall.x) / 0.82, speed);
    this.infoText?.setText(`COM 리턴 · ${this.combo + 1}번째 공을 준비하세요.`);
  }

  private endRally(playerWon: boolean, message: string): void {
    if (playerWon) {
      this.playerPoints += 1;
      this.score += 220 + this.combo * 20;
    } else {
      this.computerPoints += 1;
      this.combo = 0;
      this.cameras.main.shake(100, 0.004);
    }
    this.sportPhase = "waiting";
    this.sportBall?.setVisible(false);
    this.sportHitGlow?.setVisible(false);
    this.nextSportServeAt = this.time.now + 760;
    this.infoText?.setText(`${message} · ${this.playerPoints}:${this.computerPoints}`);
    this.updateSportScore();
    if (this.playerPoints >= 5 || this.computerPoints >= 5) this.time.delayedCall(450, () => this.finish(this.playerPoints > this.computerPoints));
  }

  private createFootballMatch(): void {
    this.add.rectangle(195, 270, 220, 112, 0xffffff, 0.08).setStrokeStyle(6, 0xffffff, 0.9).setDepth(3);
    for (let x = 92; x <= 298; x += 26) this.add.line(0, 0, x, 214, x, 326, 0xffffff, 0.24).setOrigin(0).setDepth(2);
    for (let y = 228; y <= 318; y += 22) this.add.line(0, 0, 88, y, 302, y, 0xffffff, 0.22).setOrigin(0).setDepth(2);
    const opponent = this.randomOpponentProfile();
    this.computerAthlete = this.createAthlete(195, 332, 0.78, opponent, true).setDepth(5);
    this.playerAthlete = this.createAthlete(195, 540, 0.92, this.playerProfile(), false).setDepth(8);
    this.sportBall = this.add.circle(195, 502, 17, 0xfaf8ef).setStrokeStyle(3, 0x33494e, 0.55).setDepth(12);
    this.add.polygon(195, 502, [-7, -4, 0, -10, 8, -4, 5, 5, -5, 5], 0x405154).setDepth(13);
    this.sportHitTarget = this.add.circle(195, 502, 37, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).setDepth(14);
    this.timingObject = this.add.circle(195, 270, 27, 0x65d3b1, 0.13).setStrokeStyle(3, 0x65d3b1, 0.95).setDepth(4);
    this.sportHitTarget.on("pointerdown", () => this.attemptFootballShot());
    this.sportPhase = "football-ready";
    this.updateSportScore();
    this.infoText?.setText(`${opponent.name} COM 골키퍼 · 공을 터치해 조준 원 방향으로 슛하세요.`);
  }

  private updateFootball(time: number): void {
    if (!this.timingObject || this.sportPhase !== "football-ready") return;
    this.timingPhase = (time - this.startedAt) / 520;
    this.timingObject.x = 195 + Math.sin(this.timingPhase) * 92;
    this.timingObject.y = 267 + Math.sin(this.timingPhase * 0.63) * 27;
  }

  private attemptFootballShot(): void {
    if (!this.sportBall || !this.timingObject || this.sportPhase !== "football-ready") return;
    this.sportPhase = "football-shot";
    this.sportAttempts += 1;
    const shotX = this.timingObject.x;
    const shotY = this.timingObject.y;
    const guessedCorrectly = Math.random() < this.computerSkill;
    const keeperX = guessedCorrectly ? Phaser.Math.Clamp(shotX + Phaser.Math.Between(-24, 24), 112, 278) : Phaser.Utils.Array.GetRandom([108, 195, 282]);
    const saved = Math.abs(keeperX - shotX) < 45 && guessedCorrectly;
    this.swingAthlete(this.playerAthlete, false, true);
    this.tweens.add({ targets: this.computerAthlete, x: keeperX, angle: (keeperX - 195) / 5, duration: 420, ease: "Sine.easeOut" });
    this.tweens.add({
      targets: this.sportBall,
      x: shotX,
      y: shotY,
      scale: 0.68,
      duration: 520,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (saved) {
          this.computerPoints += 1;
          this.infoText?.setText(`COM 선방! 남은 슛 ${5 - this.sportAttempts}`);
          this.cameras.main.shake(90, 0.004);
        } else {
          this.playerPoints += 1;
          this.score += 360 + Math.floor(Math.abs(shotX - 195));
          this.infoText?.setText(`GOAL! ${this.playerPoints}번째 득점 · +360`);
        }
        this.updateSportScore();
        if (this.sportAttempts >= 5) {
          this.time.delayedCall(520, () => this.finish(this.playerPoints >= 3));
        } else {
          this.time.delayedCall(700, () => this.resetFootballShot());
        }
      }
    });
  }

  private resetFootballShot(): void {
    this.sportBall?.setPosition(195, 502).setScale(1);
    this.sportHitTarget?.setPosition(195, 502);
    this.computerAthlete?.setPosition(195, 332).setAngle(0);
    this.playerAthlete?.setPosition(195, 540).setAngle(0);
    this.sportPhase = "football-ready";
  }

  private performPrimaryAction(): void {
    if (this.gameId === "beach-pingpong" || this.gameId === "beach-volleyball") this.attemptRallyHit();
    if (this.gameId === "beach-football") this.attemptFootballShot();
  }

  private updateSportScore(): void {
    if (this.gameId === "beach-football") this.scoreText?.setText(`골 ${this.playerPoints} · COM 선방 ${this.computerPoints} · ${this.score}점`);
    else this.scoreText?.setText(`나 ${this.playerPoints} · COM ${this.computerPoints} · ${this.score}점`);
    gameBridge.emit("minigame:progress", {
      gameId: this.gameId,
      score: this.score,
      playerPoints: this.playerPoints,
      computerPoints: this.computerPoints
    });
  }

  private playerProfile(): AthleteProfile {
    return { name: "KEEPER", skin: 0xd99a72, hair: 0x183b4b, shirt: 0xffc75f, hairStyle: "wave" };
  }

  private randomOpponentProfile(): AthleteProfile {
    return Phaser.Utils.Array.GetRandom<AthleteProfile>([
      { name: "MIA", skin: 0xf0b087, hair: 0x704437, shirt: 0x5fc3b7, hairStyle: "bun" },
      { name: "JUN", skin: 0xa96547, hair: 0x1d3541, shirt: 0xee806f, hairStyle: "crop" },
      { name: "NOA", skin: 0x6d4234, hair: 0x282532, shirt: 0x718fd0, hairStyle: "curl" },
      { name: "SORA", skin: 0xe2a17a, hair: 0x9c5049, shirt: 0x55b789, hairStyle: "wave" }
    ]);
  }

  private createAthlete(x: number, y: number, scale: number, profile: AthleteProfile, computer: boolean): Phaser.GameObjects.Container {
    const shadow = this.add.ellipse(0, 17, 68, 14, 0x274954, 0.18);
    const legs = this.add.rectangle(-11, 3, 14, 35, 0x496d78).setOrigin(0.5, 0);
    const otherLeg = this.add.rectangle(11, 3, 14, 35, 0x496d78).setOrigin(0.5, 0);
    const body = this.add.rectangle(0, -34, 52, 61, profile.shirt).setStrokeStyle(2, 0xffffff, 0.34);
    const neck = this.add.rectangle(0, -69, 12, 15, profile.skin);
    const head = this.add.circle(0, -88, 25, profile.skin).setStrokeStyle(2, 0xffffff, 0.3);
    const hair = this.add.ellipse(0, -103, 48, profile.hairStyle === "crop" ? 18 : 27, profile.hair);
    const leftEye = this.add.circle(-8, -88, 2.3, 0x233d45);
    const rightEye = this.add.circle(8, -88, 2.3, 0x233d45);
    const smile = this.add.arc(0, -79, 7, 12, 168, false, 0x000000, 0).setStrokeStyle(2, 0x934e45);
    const passiveArm = this.add.rectangle(-30, -39, 34, 9, profile.skin).setAngle(computer ? -15 : 15);
    const actionArm = this.add.container(18, -46);
    actionArm.add([
      this.add.rectangle(15, 0, 32, 9, profile.skin),
      this.add.circle(32, 0, 6, profile.skin)
    ]);
    if (this.gameId === "beach-pingpong") {
      actionArm.add(this.add.circle(43, 0, 12, computer ? 0x4c6f9b : 0xe77467).setStrokeStyle(3, 0xffffff, 0.8));
      actionArm.add(this.add.rectangle(34, 0, 15, 5, 0x8b6045));
    }
    const container = this.add.container(x, y, [shadow, legs, otherLeg, body, neck, head, hair, leftEye, rightEye, smile, passiveArm, actionArm]).setScale(scale);
    if (profile.hairStyle === "bun") container.add(this.add.circle(0, -119, 13, profile.hair));
    if (profile.hairStyle === "curl") {
      container.add(this.add.circle(-20, -101, 11, profile.hair));
      container.add(this.add.circle(20, -101, 11, profile.hair));
    }
    container.setData("action-arm", actionArm).setData("action-leg", otherLeg);
    return container;
  }

  private swingAthlete(athlete?: Phaser.GameObjects.Container, computer = false, kick = false): void {
    if (!athlete) return;
    const limb = athlete.getData(kick ? "action-leg" : "action-arm") as Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle;
    this.tweens.killTweensOf(limb);
    limb.rotation = kick ? 0 : computer ? -0.35 : 0.35;
    this.tweens.add({ targets: limb, rotation: kick ? -0.78 : computer ? 0.75 : -0.75, duration: 115, yoyo: true, ease: "Quad.easeOut" });
  }

  private createOpenWaterCatch(): void {
    this.durationMs = 38_000;
    this.add.rectangle(195, 350, 390, 700, 0x08779a);
    this.add.rectangle(195, 80, 390, 90, 0x6ed9d6, 0.58);
    [40, 155, 282].forEach((x) => this.add.triangle(x, 82, x - 42, 60, x + 28, 60, x + 94, 610, 0xffffff, 0.075));
    for (let index = 0; index < 18; index += 1) this.add.circle((index * 79) % 390, 100 + ((index * 113) % 510), 1 + index % 3, 0xd9fff2, 0.22);
    this.swimmer = this.add.container(195, 365, [
      this.add.ellipse(0, 0, 58, 24, 0xffc45d).setStrokeStyle(3, 0xffffff, 0.7),
      this.add.circle(25, -2, 10, 0xd99872),
      this.add.triangle(-32, 0, -13, -12, -13, 12, -48, 0, 0x59d6cc)
    ]).setDepth(8);
    const move = (pointer: Phaser.Input.Pointer) => this.swimTarget.set(Phaser.Math.Clamp(pointer.worldX, 35, 355), Phaser.Math.Clamp(pointer.worldY, 100, 605));
    this.input.on("pointerdown", move);
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => { if (pointer.isDown) move(pointer); });
    const spawn = () => {
      const fromLeft = Math.random() > 0.5;
      const dha = Math.random() > 0.42;
      const body = this.add.ellipse(0, 0, dha ? 44 : 36, dha ? 24 : 19, dha ? 0xffce63 : 0x77ddd0).setStrokeStyle(2, 0xffffff, 0.52);
      const tail = this.add.triangle(fromLeft ? -29 : 29, 0, 0, -12, 0, 12, fromLeft ? -18 : 18, 0, dha ? 0xf4a95f : 0x54b9b2);
      const fish = this.add.container(fromLeft ? -35 : 425, Phaser.Math.Between(135, 570), [body, tail]).setDepth(5);
      fish.setData("speed", (fromLeft ? 1 : -1) * Phaser.Math.Between(60, 105)).setData("dha", dha);
      this.runners.push(fish);
    };
    spawn();
    this.spawnEvent = this.time.addEvent({ delay: 850, callback: spawn, loop: true });
    this.infoText?.setText("물속을 터치해 헤엄치고 황금 물고기에 가까이 가세요.");
  }

  private updateOpenWater(delta: number): void {
    if (!this.swimmer) return;
    const factor = Math.min(1, delta / 120);
    this.swimmer.x = Phaser.Math.Linear(this.swimmer.x, this.swimTarget.x, factor);
    this.swimmer.y = Phaser.Math.Linear(this.swimmer.y, this.swimTarget.y, factor);
    this.swimmer.rotation = Phaser.Math.Angle.RotateTo(this.swimmer.rotation, Phaser.Math.Angle.Between(this.swimmer.x, this.swimmer.y, this.swimTarget.x, this.swimTarget.y), 0.08);
    for (const fish of [...this.runners]) {
      fish.x += Number(fish.getData("speed")) * delta / 1000;
      if (Phaser.Math.Distance.Between(fish.x, fish.y, this.swimmer.x, this.swimmer.y) < 36) {
        const dha = Boolean(fish.getData("dha"));
        this.catches += 1;
        this.score += dha ? 140 : 80;
        this.scoreText?.setText(`점수 ${this.score}`);
        this.infoText?.setText(dha ? `황금 물고기 포획 ${this.catches} · 게임 속 DHA 발견!` : `물고기 포획 ${this.catches}`);
        fish.destroy();
        this.runners = this.runners.filter((item) => item !== fish);
      } else if (fish.x < -60 || fish.x > 450) {
        fish.destroy();
        this.runners = this.runners.filter((item) => item !== fish);
      }
    }
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
    const isSurf = this.gameId === "reef-surf";
    const isDeep = this.gameId === "deepsea-descent";
    this.durationMs = isDeep ? 42_000 : isSurf ? 38_000 : 35_000;
    this.add.rectangle(195, 360, 390, 700, isDeep ? 0x061431 : isSurf ? 0x176f98 : 0x123d5b);
    if (isSurf) {
      this.add.circle(318, 92, 31, 0xffd46c);
      for (let y = 130; y < 680; y += 95) this.add.ellipse(195, y, 460, 88, y % 190 ? 0x4ebcc2 : 0x2d92ad, 0.48);
    }
    if (isDeep) {
      for (let index = 0; index < 32; index += 1) this.add.circle((index * 71) % 390, 80 + ((index * 131) % 560), 1 + index % 3, index % 4 ? 0x70ded5 : 0xb0a6ef, 0.3 + (index % 5) * 0.08);
      this.add.ellipse(30, 680, 210, 110, 0x0a0e25).setDepth(1);
      this.add.ellipse(365, 675, 250, 130, 0x0a0e25).setDepth(1);
    }
    this.add.rectangle(195, 360, 330, 570, isDeep ? 0x243b72 : 0x1e6880, 0.3);
    this.lanes.forEach((x) => this.add.line(0, 0, x, 80, x, 640, 0xc5fff1, isDeep ? 0.09 : 0.18).setOrigin(0));
    const runnerObjects = isSurf
      ? [this.add.ellipse(0, 15, 72, 15, 0xffc85c).setStrokeStyle(2, 0xffffff, 0.78), this.add.triangle(0, 0, -10, 20, 0, -21, 10, 20, 0x6de0d2).setStrokeStyle(2, 0xffffff), this.add.circle(0, -24, 7, 0xd99772)]
      : isDeep
        ? [this.add.ellipse(0, 7, 60, 36, 0xf0c65d).setStrokeStyle(3, 0xffffff, 0.62), this.add.rectangle(0, 6, 36, 22, 0x26486a).setStrokeStyle(2, 0x8ce9e0, 0.35), this.add.circle(0, 5, 7, 0x9ef2e4), this.add.triangle(-38, 8, -18, -4, -18, 20, 0x6576a2)]
        : [this.add.triangle(0, 0, 0, 34, 18, 0, 36, 34, 0x67e0d0).setStrokeStyle(3, 0xffffff), this.add.circle(18, 13, 7, 0xffd76a)];
    this.runner = this.add.container(this.lanes[this.laneIndex] ?? 195, 580, runnerObjects).setDepth(6);
    this.input.keyboard?.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveLane(1));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => (this.pointerStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY)));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerStart) return;
      const dx = pointer.worldX - this.pointerStart.x;
      if (Math.abs(dx) > 34) this.moveLane(dx > 0 ? 1 : -1);
      this.pointerStart = undefined;
    });
    const spawn = () => {
      const lane = Phaser.Math.Between(0, 2);
      const collectible = Math.random() > 0.58;
      const shape = collectible
        ? this.add.circle(0, 0, 13, isDeep ? 0x7de7d8 : 0xffd568).setStrokeStyle(3, 0xffffff, 0.7)
        : isSurf
          ? this.add.triangle(0, 0, -22, 20, 0, -25, 22, 20, 0x173e59).setStrokeStyle(2, 0xe2fff6, 0.55)
          : isDeep
            ? this.add.polygon(0, 0, [-18, -5, -8, -21, 14, -15, 21, 7, 5, 22, -16, 16], 0x9b5f83).setStrokeStyle(2, 0xf1c5dd, 0.5)
            : this.add.triangle(0, 0, -18, 18, 0, -18, 18, 18, 0xef7b72).setStrokeStyle(3, 0xffffff, 0.6);
      const object = this.add.container(this.lanes[lane] ?? 195, 80, [shape]).setDepth(5);
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
    const label = this.gameId === "reef-surf" ? "균형" : this.gameId === "deepsea-descent" ? "산소" : "내구도";
    this.infoText?.setText(`${label} ${"●".repeat(Math.max(0, this.health))}${"○".repeat(Math.max(0, 3 - this.health))} · 스와이프 또는 ← →`);
  }

  private createReefMemory(): void {
    const isCave = this.gameId === "cave-sonar";
    this.durationMs = isCave ? 55_000 : 60_000;
    if (isCave) {
      this.add.rectangle(195, 350, 390, 700, 0x101a38);
      this.add.circle(195, 330, 190, 0x5e4a93, 0.13);
      for (let index = 0; index < 18; index += 1) this.add.circle((index * 89) % 390, 80 + ((index * 127) % 550), 2 + index % 3, index % 2 ? 0x65e2ce : 0xa99fe7, 0.28);
    }
    const symbols = Phaser.Utils.Array.Shuffle(["◉", "✦", "◇", "⌁", "⋔", "≈", "◉", "✦", "◇", "⌁", "⋔", "≈"]);
    symbols.forEach((symbol, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 90 + column * 105;
      const y = 130 + row * 118;
      const card = this.add
        .rectangle(x, y, 82, 92, isCave ? 0x3c3d75 : 0x178796)
        .setStrokeStyle(4, 0xffffff, 0.72)
        .setInteractive({ useHandCursor: true })
        .setData("symbol", symbol)
        .setData("matched", false)
        .setData("revealed", false);
      const label = this.add
        .text(x, y, "?", { fontFamily: "system-ui", fontSize: "30px", fontStyle: "bold", color: "#f7f0d8", resolution: Number(this.registry.get("render-scale")) || 1 })
        .setOrigin(0.5)
        .setData("card-label", true);
      card.setData("label", label);
      card.on("pointerdown", () => this.flipCard(card));
    });
    this.infoText?.setText(isCave ? "같은 소나 반향 6쌍을 찾아 산소 포켓을 여세요." : "6쌍의 해양 심볼을 찾아보세요.");
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
        item.setData("revealed", false).setFillStyle(this.gameId === "cave-sonar" ? 0x3c3d75 : 0x178796);
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

  private successAtTimeout(): boolean {
    if (this.gameId === "reef-memory" || this.gameId === "cave-sonar") return this.matchedPairs >= 4;
    if (this.gameId === "beach-football") return this.playerPoints >= 3;
    if (this.gameId === "beach-pingpong" || this.gameId === "beach-volleyball") return this.score > 0 && this.playerPoints >= this.computerPoints;
    return this.score > 0;
  }

  private title(): string {
    const oceanGame = OCEAN_GAME_BY_ID.get(this.gameId);
    if (oceanGame) return oceanGame.title;
    return { "bubble-focus": "Bubble Focus", "current-run": "Current Run", "reef-memory": "Reef Memory" }[this.gameId as "bubble-focus" | "current-run" | "reef-memory"] ?? "Ocean Game";
  }

  private instruction(): string {
    const oceanGame = OCEAN_GAME_BY_ID.get(this.gameId);
    if (oceanGame) return oceanGame.instruction;
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
