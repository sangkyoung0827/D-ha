import Phaser from "phaser";
import { ITEM_BY_ID } from "../../domain/catalog";
import { OUTFIT_COLORS, breedDefinition, furColorValue, petAccentColor, type PetProfile } from "../../domain/pet";
import type { MiniGameResult } from "../../domain/types";
import { OCEAN_GAME_BY_ID, OCEAN_RUN_CHAPTERS, type OceanRunChapterId } from "../../domain/ocean";
import { gameBridge } from "../bridge/GameBridge";
import { applyHighDpiCamera } from "../renderQuality";

type GameId = MiniGameResult["gameId"];

interface PetRenderProfile extends PetProfile {
  fur: number;
  accent: number;
  outfitColor: number;
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
  private playerPet?: Phaser.GameObjects.Container;
  private computerPet?: Phaser.GameObjects.Container;
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
  private oceanChapterIndex = 0;
  private oceanDistance = 0;
  private oceanJumping = false;
  private oceanTransitioning = false;
  private oceanInvulnerableUntil = 0;
  private oceanLastProgressAt = 0;
  private oceanEnvironment: Phaser.GameObjects.GameObject[] = [];
  private oceanAmbient: Phaser.GameObjects.Container[] = [];
  private oceanBackground?: Phaser.GameObjects.Image;
  private oceanChapterText?: Phaser.GameObjects.Text;
  private oceanDha = 100;
  private oceanNextDhaAt = 0;
  private oceanDhaDepleted = false;
  private oceanDhaFill?: Phaser.GameObjects.Rectangle;
  private oceanDhaText?: Phaser.GameObjects.Text;
  private oceanVisionFog?: Phaser.GameObjects.Rectangle;
  private jumpPlatforms: Phaser.GameObjects.Container[] = [];
  private jumpVelocityY = -420;
  private jumpAltitude = 0;
  private jumpPhaseIndex = 0;
  private jumpPlatformSerial = 0;
  private jumpNextDhaPlatform = 4;
  private jumpTopLane = 1;
  private jumpBoostAvailable = true;
  private jumpLastHudAt = 0;
  private jumpBackground?: Phaser.GameObjects.Rectangle;
  private jumpPhaseText?: Phaser.GameObjects.Text;
  private jumpStars: Phaser.GameObjects.Arc[] = [];
  private jumpScenery: Phaser.GameObjects.GameObject[] = [];
  private readonly oceanRunnerY = 430;
  private readonly oceanHorizonY = 228;

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
    this.playerPet = undefined;
    this.computerPet = undefined;
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
    this.oceanChapterIndex = 0;
    this.oceanDistance = 0;
    this.oceanJumping = false;
    this.oceanTransitioning = false;
    this.oceanInvulnerableUntil = 0;
    this.oceanLastProgressAt = 0;
    this.oceanEnvironment = [];
    this.oceanAmbient = [];
    this.oceanBackground = undefined;
    this.oceanChapterText = undefined;
    this.oceanDha = 100;
    this.oceanNextDhaAt = 0;
    this.oceanDhaDepleted = false;
    this.oceanDhaFill = undefined;
    this.oceanDhaText = undefined;
    this.oceanVisionFog = undefined;
    this.jumpPlatforms = [];
    this.jumpVelocityY = -420;
    this.jumpAltitude = 0;
    this.jumpPhaseIndex = 0;
    this.jumpPlatformSerial = 0;
    this.jumpNextDhaPlatform = 4;
    this.jumpTopLane = 1;
    this.jumpBoostAvailable = true;
    this.jumpLastHudAt = 0;
    this.jumpBackground = undefined;
    this.jumpPhaseText = undefined;
    this.jumpStars = [];
    this.jumpScenery = [];
  }

  create(): void {
    const renderScale = applyHighDpiCamera(this);
    this.startedAt = this.time.now;
    const darkGame = this.gameId === "current-run" || this.gameId === "ocean-run" || this.gameId === "jump-up" || this.gameId === "reef-surf" || this.gameId === "cave-sonar" || this.gameId === "deepsea-descent";
    this.cameras.main.setBackgroundColor(darkGame ? "#102d4d" : "#dff5ec");
    this.add
      .text(58, 18, this.title(), { fontFamily: "system-ui", fontSize: "17px", fontStyle: "bold", color: darkGame ? "#e6fff8" : "#174b57", resolution: renderScale })
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
    if (this.gameId === "ocean-run") this.createOceanRun();
    if (this.gameId === "jump-up") this.createJumpUp();
    if (this.gameId === "beach-volleyball" || this.gameId === "beach-pingpong" || this.gameId === "beach-football") this.createBeachSport();
    if (this.gameId === "open-water-catch") this.createOpenWaterCatch();
    if (this.gameId === "reef-surf" || this.gameId === "deepsea-descent") this.createCurrentRun();
    if (this.gameId === "cave-sonar") this.createReefMemory();

    this.finishEvent = this.time.delayedCall(this.durationMs, () => this.finish(this.successAtTimeout()));
    this.cleanupBridge = [
      gameBridge.on("minigame:move", ({ direction }) => this.moveLane(direction)),
      gameBridge.on("minigame:action", () => this.performPrimaryAction()),
      gameBridge.on("minigame:debug-dha", ({ value }) => {
        if ((this.gameId !== "ocean-run" && this.gameId !== "jump-up") || this.finished) return;
        this.oceanDha = Phaser.Math.Clamp(value, 0, 100);
        this.updateOceanDhaEffects(this.time.now);
        if (this.gameId === "jump-up") this.updateJumpUpHud();
        else this.updateOceanHud();
        if (this.oceanDha <= 0) this.endOceanRunForDha();
      }),
      gameBridge.on("minigame:debug-jump-space", () => {
        if (this.gameId !== "jump-up" || this.finished) return;
        this.jumpAltitude = Math.max(this.jumpAltitude, 65_000);
        this.updateJumpUpPhase();
        this.updateJumpUpHud();
      }),
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
    if (this.gameId === "ocean-run") this.updateOceanRun(delta, time);
    if (this.gameId === "jump-up") this.updateJumpUp(delta, time);
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

    const opponent = this.randomPetProfile();
    this.computerPet = this.createSportPet(195, pingPong ? 272 : 278, pingPong ? 0.72 : 0.78, opponent, true).setDepth(pingPong ? 2 : 4);
    this.playerPet = this.createSportPet(195, pingPong ? 550 : 556, pingPong ? 0.9 : 0.94, this.playerPetProfile(), false).setDepth(8);
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
    this.sportBall.setPosition(this.computerPet?.x ?? 195, pingPong ? 305 : 300).setVisible(true);
    const targetX = Phaser.Math.Between(pingPong ? 132 : 110, pingPong ? 258 : 280);
    const speed = pingPong ? 285 : 252;
    this.sportVelocity.set((targetX - this.sportBall.x) / 0.9, speed);
    this.swingPet(this.computerPet, true);
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
    this.swingPet(this.playerPet, false);
    this.tweens.add({ targets: this.playerPet, x: Phaser.Math.Clamp(this.sportBall.x, 132, 258), duration: 130, yoyo: true, ease: "Sine.easeOut" });
    this.infoText?.setText(`${this.combo} 랠리 · 정확한 리턴 +${points}`);
    this.updateSportScore();
  }

  private computerReturn(): void {
    if (!this.sportBall) return;
    this.swingPet(this.computerPet, true);
    this.tweens.add({ targets: this.computerPet, x: Phaser.Math.Clamp(this.sportBall.x, 132, 258), duration: 120, yoyo: true, ease: "Sine.easeOut" });
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
    const opponent = this.randomPetProfile();
    this.computerPet = this.createSportPet(195, 332, 0.78, opponent, true).setDepth(5);
    this.playerPet = this.createSportPet(195, 540, 0.92, this.playerPetProfile(), false).setDepth(8);
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
    const defenderX = guessedCorrectly ? Phaser.Math.Clamp(shotX + Phaser.Math.Between(-24, 24), 112, 278) : Phaser.Utils.Array.GetRandom([108, 195, 282]);
    const saved = Math.abs(defenderX - shotX) < 45 && guessedCorrectly;
    this.swingPet(this.playerPet, false, true);
    this.tweens.add({ targets: this.computerPet, x: defenderX, angle: (defenderX - 195) / 5, duration: 420, ease: "Sine.easeOut" });
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
    this.computerPet?.setPosition(195, 332).setAngle(0);
    this.playerPet?.setPosition(195, 540).setAngle(0);
    this.sportPhase = "football-ready";
  }

  private performPrimaryAction(): void {
    if (this.gameId === "ocean-run") this.jumpOceanRunner();
    if (this.gameId === "jump-up") this.boostJumpUp();
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

  private playerPetProfile(): PetRenderProfile {
    const presentation = this.registry.get("initial-presentation") as {
      style?: Partial<PetProfile> & { equipped?: { top?: string | null; accessory?: string | null } };
    } | undefined;
    const style = presentation?.style;
    const topColor = style?.equipped?.top ? ITEM_BY_ID[style.equipped.top]?.color : undefined;
    const appearance: PetProfile = {
      name: style?.name ?? "DIHA",
      species: style?.species ?? "dog",
      breed: style?.breed ?? "maltese",
      furColor: style?.furColor ?? "snow",
      pattern: style?.pattern ?? "solid",
      collar: style?.collar ?? "teal",
      hat: style?.hat ?? "none",
      accessory: style?.accessory && style.accessory !== "none" ? style.accessory : style?.equipped?.accessory ? "round" : "none",
      outfit: style?.outfit ?? "tee"
    };
    return this.toPetRenderProfile(appearance, topColor);
  }

  private toPetRenderProfile(profile: PetProfile, equippedOutfitColor?: string): PetRenderProfile {
    const profileOutfitColor = profile.outfit === "none" ? furColorValue(profile.furColor) : OUTFIT_COLORS[profile.outfit];
    return { ...profile, fur: this.hexColor(furColorValue(profile.furColor)), accent: this.hexColor(petAccentColor(profile)), outfitColor: this.hexColor(equippedOutfitColor ?? profileOutfitColor) };
  }

  private randomPetProfile(): PetRenderProfile {
    const options: PetProfile[] = [
      { name: "보리", species: "dog", breed: "poodle", furColor: "apricot", pattern: "solid", collar: "coral", hat: "none", accessory: "round", outfit: "tee" },
      { name: "구름", species: "dog", breed: "bichon", furColor: "snow", pattern: "solid", collar: "navy", hat: "cap", accessory: "none", outfit: "sailor" },
      { name: "나비", species: "cat", breed: "koreanShorthair", furColor: "cream", pattern: "tabby", collar: "teal", hat: "none", accessory: "none", outfit: "hoodie" },
      { name: "루나", species: "cat", breed: "russianBlue", furColor: "blue", pattern: "solid", collar: "gold", hat: "none", accessory: "square", outfit: "none" }
    ];
    return this.toPetRenderProfile(Phaser.Utils.Array.GetRandom(options));
  }

  private createSportPet(x: number, y: number, scale: number, profile: PetRenderProfile, computer: boolean): Phaser.GameObjects.Container {
    const breed = breedDefinition(profile.breed);
    const shadow = this.add.ellipse(0, 17, 82, 15, 0x274954, 0.18);
    const leftLeg = this.add.rectangle(-14, -5, 17, 39, profile.fur).setOrigin(0.5, 0).setStrokeStyle(1, profile.accent, 0.24);
    const rightLeg = this.add.rectangle(14, -5, 17, 39, profile.fur).setOrigin(0.5, 0).setStrokeStyle(1, profile.accent, 0.24);
    const body = this.add.ellipse(0, -38, 68, 69, profile.outfit === "none" ? profile.fur : profile.outfitColor).setStrokeStyle(2, 0xffffff, 0.34);
    const head = this.add.ellipse(0, -92, 66, 60, profile.fur).setStrokeStyle(2, 0xffffff, 0.3);
    const ears = breed.ears === "drop"
      ? [this.add.ellipse(-32, -91, 22, 49, profile.fur).setAngle(10), this.add.ellipse(32, -91, 22, 49, profile.fur).setAngle(-10)]
      : [this.add.triangle(-24, -111, -14, 17, 0, -20, 13, 17, profile.fur), this.add.triangle(24, -111, -14, 17, 0, -20, 13, 17, profile.fur)];
    const muzzle = this.add.ellipse(0, -78, breed.muzzle === "long" ? 42 : 34, 25, 0xf4eadc, 0.86);
    const nose = this.add.ellipse(0, -83, 9, 7, 0x343536);
    const leftEye = this.add.circle(-12, -96, 3.5, profile.species === "cat" ? 0x356f66 : 0x233d45);
    const rightEye = this.add.circle(12, -96, 3.5, profile.species === "cat" ? 0x356f66 : 0x233d45);
    const smile = this.add.arc(0, -74, 7, 12, 168, false, 0x000000, 0).setStrokeStyle(2, 0x934e45);
    const passivePaw = this.add.rectangle(-37, -42, 38, 11, profile.fur).setAngle(computer ? -15 : 15).setStrokeStyle(1, profile.accent, 0.2);
    const actionPaw = this.add.container(21, -48);
    actionPaw.add([this.add.rectangle(16, 0, 35, 11, profile.fur), this.add.circle(35, 0, 7, profile.fur)]);
    if (this.gameId === "beach-pingpong") {
      actionPaw.add(this.add.circle(46, 0, 13, computer ? 0x4c6f9b : 0xe77467).setStrokeStyle(3, 0xffffff, 0.8));
      actionPaw.add(this.add.rectangle(37, 0, 16, 5, 0x8b6045));
    }
    const tail = profile.species === "cat" ? this.add.arc(32, -36, 31, 250, 80, false, 0x000000, 0).setStrokeStyle(9, profile.fur) : this.add.ellipse(39, -49, 31, 13, profile.fur).setAngle(-25);
    const container = this.add.container(x, y, [shadow, tail, leftLeg, rightLeg, body, ...ears, head, muzzle, nose, leftEye, rightEye, smile, passivePaw, actionPaw]).setScale(scale);
    this.addFrontPetAccessories(container, profile);
    container.setData("action-paw", actionPaw).setData("action-leg", rightLeg);
    return container;
  }

  private addFrontPetAccessories(container: Phaser.GameObjects.Container, profile: PetRenderProfile): void {
    if (profile.accessory === "round" || profile.accessory === "square" || profile.accessory === "sunglasses") {
      const square = profile.accessory === "square";
      const alpha = profile.accessory === "sunglasses" ? 0.72 : 0.12;
      const left = square ? this.add.rectangle(-13, -96, 20, 15, 0x264751, alpha).setStrokeStyle(2, 0x274751) : this.add.circle(-13, -96, 9, 0x264751, alpha).setStrokeStyle(2, 0x274751);
      const right = square ? this.add.rectangle(13, -96, 20, 15, 0x264751, alpha).setStrokeStyle(2, 0x274751) : this.add.circle(13, -96, 9, 0x264751, alpha).setStrokeStyle(2, 0x274751);
      container.add([left, right, this.add.rectangle(0, -96, 7, 2, 0x274751)]);
    }
    if (profile.hat !== "none") {
      const color = profile.hat === "cap" ? 0x3b8490 : profile.hat === "beanie" ? 0xef7c6e : 0xe5c270;
      container.add(this.add.ellipse(0, -122, profile.hat === "sunhat" ? 88 : 58, profile.hat === "beanie" ? 28 : 18, color));
    }
  }

  private hexColor(value: string): number {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }

  private swingPet(pet?: Phaser.GameObjects.Container, computer = false, kick = false): void {
    if (!pet) return;
    const limb = pet.getData(kick ? "action-leg" : "action-paw") as Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle;
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

  private createJumpUp(): void {
    this.durationMs = 50_000;
    this.oceanDha = 100;
    this.scoreText?.setPosition(16, 146).setFontSize(12).setBackgroundColor("#111638bd").setPadding(9, 6);
    this.timerText?.setPosition(374, 146).setFontSize(14).setBackgroundColor("#111638bd").setPadding(9, 6);
    this.jumpBackground = this.add.rectangle(195, 350, 390, 700, 0x66cfd4).setDepth(0);
    this.add.circle(64, 108, 42, 0xffdf7d, 0.92).setDepth(1);
    this.add.ellipse(195, 684, 520, 142, 0xf4d68e).setDepth(1);
    this.add.ellipse(195, 650, 470, 74, 0x4cbaa9, 0.38).setDepth(1);
    for (let index = 0; index < 34; index += 1) {
      const star = this.add.circle((index * 73 + 19) % 390, 78 + ((index * 109) % 520), 1 + index % 3, index % 4 ? 0xe7f8ff : 0xffe59b, 0).setDepth(1);
      this.jumpStars.push(star);
    }
    for (let index = 0; index < 7; index += 1) {
      const cloud = this.add.ellipse(45 + (index * 91) % 330, 170 + index * 72, 82 + index % 3 * 18, 24, 0xffffff, 0.42).setDepth(2);
      this.jumpScenery.push(cloud);
      if (!this.registry.get("reduced-motion")) this.tweens.add({ targets: cloud, x: cloud.x + (index % 2 ? 22 : -22), duration: 2600 + index * 230, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    this.jumpPhaseText = this.add.text(195, 104, "01  해변 위", {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "#151b47b8",
      padding: { x: 12, y: 7 },
      resolution: Number(this.registry.get("render-scale")) || 1
    }).setOrigin(0.5).setDepth(20);

    const initialPlatforms: Array<[number, number]> = [[620, 1], [522, 1], [430, 0], [338, 1], [246, 2], [154, 1], [68, 0]];
    for (const [y, lane] of initialPlatforms) this.createJumpPlatform(y, lane, y === 620);
    this.runner = this.createSportPet(this.lanes[1] ?? 195, 588, 0.72, this.playerPetProfile(), false).setDepth(14);
    this.jumpVelocityY = -430;
    this.createOceanDhaHud();

    this.input.keyboard?.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveLane(1));
    this.input.keyboard?.on("keydown-UP", () => this.boostJumpUp());
    this.input.keyboard?.on("keydown-SPACE", () => this.boostJumpUp());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerStart) return;
      const dx = pointer.worldX - this.pointerStart.x;
      const dy = pointer.worldY - this.pointerStart.y;
      if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy)) this.moveLane(dx > 0 ? 1 : -1);
      else this.boostJumpUp();
      this.pointerStart = undefined;
    });
    this.updateJumpUpHud();
  }

  private createJumpPlatform(y: number, lane: number, safe = false): void {
    this.jumpPlatformSerial += 1;
    const hasDha = !safe && this.jumpPlatformSerial === this.jumpNextDhaPlatform;
    if (hasDha) this.jumpNextDhaPlatform += Phaser.Math.Between(4, 6);
    const phaseColor = [0xf3cf63, 0x7addcf, 0x99a8ef, 0x746fe1][this.jumpPhaseIndex] ?? 0xf3cf63;
    const platform = this.add.container(this.lanes[lane] ?? 195, y).setDepth(8);
    const shadow = this.add.ellipse(0, 7, 104, 18, 0x10173f, 0.2);
    const slab = this.add.rectangle(0, 0, 96, 18, phaseColor).setStrokeStyle(3, 0xffffff, 0.82);
    const shine = this.add.rectangle(-13, -4, 54, 4, 0xffffff, 0.3);
    platform.add([shadow, slab, shine]);
    if (hasDha) {
      const glow = this.add.circle(0, -30, 27, 0x8ff5e8, 0.24).setBlendMode(Phaser.BlendModes.ADD);
      const capsule = this.add.graphics().setPosition(0, -30);
      capsule.fillStyle(0xffca68, 1).fillRoundedRect(-20, -10, 20, 20, 10);
      capsule.fillStyle(0x53d7cb, 1).fillRoundedRect(0, -10, 20, 20, 10);
      capsule.lineStyle(3, 0xffffff, 0.96).strokeRoundedRect(-20, -10, 40, 20, 10);
      capsule.lineStyle(1.5, 0xffffff, 0.85).lineBetween(0, -9, 0, 9);
      const label = this.add.text(0, -30, "DHA", { fontFamily: "system-ui", fontSize: "7px", fontStyle: "bold", color: "#153b48", resolution: Number(this.registry.get("render-scale")) || 1 }).setOrigin(0.5);
      platform.add([glow, capsule, label]);
      platform.setData("pill-parts", [glow, capsule, label]);
    }
    platform.setData("lane", lane).setData("dha", hasDha).setData("collected", false);
    this.jumpPlatforms.push(platform);
    this.jumpTopLane = lane;
  }

  private updateJumpUp(delta: number, time: number): void {
    if (!this.runner) return;
    this.oceanDha = Math.max(0, this.oceanDha - delta * 0.0021);
    this.updateOceanDhaEffects(time);
    if (this.oceanDha <= 0) {
      this.endOceanRunForDha();
      return;
    }

    const seconds = delta / 1000;
    const footOffset = 25;
    const previousFoot = this.runner.y + footOffset;
    this.jumpVelocityY += 780 * seconds;
    this.runner.y += this.jumpVelocityY * seconds;
    const currentFoot = this.runner.y + footOffset;

    if (this.jumpVelocityY >= 0) {
      const landing = this.jumpPlatforms
        .filter((platform) => previousFoot <= platform.y + 2 && currentFoot >= platform.y - 3 && Math.abs(this.runner!.x - platform.x) < 55)
        .sort((a, b) => a.y - b.y)[0];
      if (landing) {
        this.runner.y = landing.y - footOffset;
        this.jumpVelocityY = -430;
        this.jumpBoostAvailable = true;
        this.score += 55 + this.jumpPhaseIndex * 15;
        this.tweens.add({ targets: landing, scaleX: 0.9, scaleY: 0.76, duration: 80, yoyo: true, ease: "Sine.easeOut" });
        if (landing.getData("dha") && !landing.getData("collected")) this.collectJumpUpDha(landing);
      }
    }

    if (this.runner.y < 300) {
      const shift = 300 - this.runner.y;
      this.runner.y = 300;
      this.jumpPlatforms.forEach((platform) => { platform.y += shift; });
      this.jumpScenery.forEach((object) => {
        if ("y" in object && typeof object.y === "number") object.y += shift * 0.35;
      });
      this.jumpAltitude += shift * 45;
      this.score += shift * 0.65;
      this.ensureJumpPlatforms();
      this.updateJumpUpPhase();
    }

    for (const platform of [...this.jumpPlatforms]) {
      if (platform.y > 735) {
        platform.destroy();
        this.jumpPlatforms = this.jumpPlatforms.filter((item) => item !== platform);
      }
    }

    if (this.runner.y > 735) {
      this.infoText?.setText("발판을 놓쳤어요 · 다음 도전에서는 좌우 이동을 더 빠르게!");
      this.finish(false);
      return;
    }
    if (time - this.jumpLastHudAt > 160) {
      this.jumpLastHudAt = time;
      this.updateJumpUpHud();
    }
  }

  private ensureJumpPlatforms(): void {
    let top = this.jumpPlatforms.reduce((value, platform) => Math.min(value, platform.y), 700);
    while (top > 70) {
      top -= Phaser.Math.Between(78, 96);
      let lane = Phaser.Math.Clamp(this.jumpTopLane + Phaser.Math.Between(-1, 1), 0, 2);
      if (lane === this.jumpTopLane && Math.random() > 0.45) lane = Phaser.Math.Clamp(lane + (lane === 2 ? -1 : 1), 0, 2);
      this.createJumpPlatform(top, lane);
    }
  }

  private collectJumpUpDha(platform: Phaser.GameObjects.Container): void {
    platform.setData("collected", true);
    this.oceanDha = Math.min(100, this.oceanDha + 30);
    this.score += 180;
    this.combo += 1;
    const pillParts = platform.getData("pill-parts") as Phaser.GameObjects.GameObject[] | undefined;
    pillParts?.forEach((part) => this.tweens.add({ targets: part, y: "-=18", alpha: 0, scale: 1.4, duration: 180, onComplete: () => part.destroy() }));
    this.cameras.main.flash(110, 143, 245, 232, false);
    this.infoText?.setText(`DHA 알약 획득 · 게이지 +30 · ${this.combo} 콤보`);
    this.updateOceanDhaEffects(this.time.now);
    this.updateJumpUpHud();
  }

  private updateJumpUpPhase(): void {
    const nextPhase = this.jumpAltitude >= 60_000 ? 3 : this.jumpAltitude >= 18_000 ? 2 : this.jumpAltitude >= 3_000 ? 1 : 0;
    if (nextPhase === this.jumpPhaseIndex) return;
    this.jumpPhaseIndex = nextPhase;
    const phaseNames = ["01  해변 위", "02  구름 바다", "03  대기권", "04  우주"];
    const colors = [0x66cfd4, 0x5c9ed0, 0x39477f, 0x090d2d];
    this.jumpBackground?.setFillStyle(colors[nextPhase] ?? 0x090d2d);
    this.jumpPhaseText?.setText(phaseNames[nextPhase] ?? "04  우주").setScale(0.92).setAlpha(0.3);
    this.tweens.add({ targets: this.jumpPhaseText, scale: 1, alpha: 1, duration: 240, ease: "Back.easeOut" });
    this.jumpStars.forEach((star, index) => star.setAlpha(nextPhase < 2 ? 0 : nextPhase === 2 ? 0.22 + index % 4 * 0.08 : 0.5 + index % 4 * 0.12));
    this.jumpPlatforms.forEach((platform) => {
      const slab = platform.list[1] as Phaser.GameObjects.Rectangle | undefined;
      slab?.setFillStyle([0xf3cf63, 0x7addcf, 0x99a8ef, 0x746fe1][nextPhase] ?? 0x746fe1);
    });
    this.cameras.main.flash(180, 218, 245, 255, false);
  }

  private updateJumpUpHud(): void {
    const phases = ["해변 위", "구름 바다", "대기권", "우주"];
    const altitude = Math.floor(this.jumpAltitude);
    this.scoreText?.setText(`${phases[this.jumpPhaseIndex]} · ${altitude.toLocaleString()} m · ${Math.floor(this.score)}점`);
    if (!this.finished) this.infoText?.setText(`DHA ${Math.ceil(this.oceanDha)}% · ← → 다음 발판으로 이동 · 자동 점프`);
    gameBridge.emit("minigame:progress", {
      gameId: this.gameId,
      score: Math.floor(this.score),
      playerPoints: this.jumpPhaseIndex + 1,
      computerPoints: altitude,
      dha: Math.ceil(this.oceanDha)
    });
  }

  private boostJumpUp(): void {
    if (this.gameId !== "jump-up" || !this.runner || this.finished || !this.jumpBoostAvailable) return;
    this.jumpBoostAvailable = false;
    this.jumpVelocityY = Math.min(this.jumpVelocityY, -445);
    this.tweens.add({ targets: this.runner, scaleX: 0.76, scaleY: 0.68, duration: 85, yoyo: true, ease: "Sine.easeOut" });
  }

  private createOceanRun(): void {
    this.durationMs = 48_000;
    this.health = 3;
    this.scoreText?.setPosition(16, 146).setFontSize(12).setBackgroundColor("#061d2ab8").setPadding(9, 6);
    this.timerText?.setPosition(374, 146).setFontSize(14).setBackgroundColor("#061d2ab8").setPadding(9, 6);
    this.enterOceanChapter("beach", true);
    this.oceanNextDhaAt = this.time.now + Phaser.Math.Between(3_800, 4_800);
    this.createOceanDhaHud();
    this.input.keyboard?.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveLane(1));
    this.input.keyboard?.on("keydown-UP", () => this.jumpOceanRunner());
    this.input.keyboard?.on("keydown-SPACE", () => this.jumpOceanRunner());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerStart) return;
      const dx = pointer.worldX - this.pointerStart.x;
      const dy = pointer.worldY - this.pointerStart.y;
      if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) this.moveLane(dx > 0 ? 1 : -1);
      else if (dy < -24 || Math.abs(dx) < 18) this.jumpOceanRunner();
      this.pointerStart = undefined;
    });
    this.spawnEvent = this.time.addEvent({ delay: 720, callback: () => this.spawnOceanObject(), loop: true });
    this.updateOceanHud();
  }

  private updateOceanRun(delta: number, time: number): void {
    if (!this.oceanTransitioning) {
      this.oceanDha = Math.max(0, this.oceanDha - delta * 0.00235);
      this.updateOceanDhaEffects(time);
      if (this.oceanDha <= 0) {
        this.endOceanRunForDha();
        return;
      }
    }
    const elapsed = time - this.startedAt;
    const nextChapterIndex = Math.min(3, Math.floor(elapsed / 12_000));
    if (nextChapterIndex > this.oceanChapterIndex && !this.oceanTransitioning) {
      const next = OCEAN_RUN_CHAPTERS[nextChapterIndex];
      if (next) this.enterOceanChapter(next.id, false);
    }

    const chapterSpeed = 190 + this.oceanChapterIndex * 24 + Math.min(70, elapsed / 400);
    this.oceanDistance += (chapterSpeed * delta) / 10_000;
    this.score += (chapterSpeed * delta) / 8500;

    if (this.oceanBackground) {
      const surge = 1.035 + Math.sin(time / 780) * 0.008;
      this.oceanBackground.setScale(surge).setPosition(195 + Math.sin(time / 1450) * 1.4, 350 + Math.sin(time / 520) * 1.7);
    }

    for (const ambient of this.oceanAmbient) {
      if (ambient.getData("perspective-flow")) {
        let progress = Number(ambient.getData("progress")) + Number(ambient.getData("speed")) * delta / 1000;
        if (progress > 1) progress -= 1;
        ambient.setData("progress", progress);
        const depth = progress * progress;
        ambient.x = 195 + Number(ambient.getData("spread")) * depth;
        ambient.y = Phaser.Math.Linear(this.oceanHorizonY, 704, depth);
        ambient.setScale(Phaser.Math.Linear(0.12, 1.5, depth)).setAlpha(Phaser.Math.Clamp(progress * 1.4, 0.08, 0.68)).setDepth(3 + Math.floor(progress * 5));
      } else {
        ambient.y += Number(ambient.getData("speed")) * delta / 1000;
        if (ambient.y > 725) ambient.y = -60;
      }
    }

    for (const object of [...this.runners]) {
      const speedFactor = Number(object.getData("speed"));
      const travelTime = Math.max(1_850, 3_350 - this.oceanChapterIndex * 260 - Math.min(620, elapsed / 45));
      const progress = Number(object.getData("path-progress")) + delta / travelTime * speedFactor;
      object.setData("path-progress", progress);
      const depth = Phaser.Math.Clamp(progress * progress, 0, 1.25);
      const targetLane = Number(object.getData("lane"));
      object.x = Phaser.Math.Linear(195, this.lanes[targetLane] ?? 195, Phaser.Math.Clamp(progress * 1.08, 0, 1));
      object.y = Phaser.Math.Linear(this.oceanHorizonY, 686, depth);
      object.setScale(Phaser.Math.Linear(0.07, 1.18, Math.pow(Phaser.Math.Clamp(progress, 0, 1), 1.55))).setDepth(7 + Math.floor(progress * 9));
      const reachesRunner = progress > 0.82 && progress < 0.97 && targetLane === this.laneIndex;
      if (this.runner && reachesRunner && (object.getData("collectible") || !this.oceanJumping)) {
        if (object.getData("collectible")) {
          this.oceanDha = Math.min(100, this.oceanDha + 30);
          this.score += 160;
          this.combo += 1;
          this.infoText?.setText(`DHA 알약 섭취 · 게이지 +30 · ${this.combo} 콤보`);
          this.cameras.main.flash(110, 143, 245, 232, false);
          this.updateOceanDhaEffects(time);
        } else if (time >= this.oceanInvulnerableUntil) {
          this.health -= 1;
          this.combo = 0;
          this.oceanInvulnerableUntil = time + 750;
          this.cameras.main.shake(150, 0.009);
          this.infoText?.setText(`${String(object.getData("label"))} 충돌 · 좌우 이동 또는 점프로 피하세요!`);
          this.runner.setAlpha(0.45);
          this.time.delayedCall(420, () => this.runner?.setAlpha(1));
          if (this.health <= 0) {
            this.finish(false);
            return;
          }
        }
        this.removeOceanObject(object);
        this.updateOceanHud();
      } else if (progress > 1.08) {
        if (!object.getData("collectible")) {
          this.score += 28;
          this.combo += 1;
        }
        this.removeOceanObject(object);
      }
    }

    if (time - this.oceanLastProgressAt > 180) {
      this.oceanLastProgressAt = time;
      this.updateOceanHud();
    }
  }

  private createOceanDhaHud(): void {
    const renderScale = Number(this.registry.get("render-scale")) || 1;
    this.add.rectangle(357, 290, 42, 156, 0x061d2a, 0.82).setStrokeStyle(2, 0xbffff5, 0.42).setDepth(25);
    this.add.text(357, 222, "DHA", {
      fontFamily: "system-ui",
      fontSize: "10px",
      fontStyle: "bold",
      color: "#dffff8",
      resolution: renderScale
    }).setOrigin(0.5).setDepth(26);
    this.add.rectangle(357, 297, 14, 112, 0x173c49, 0.92).setStrokeStyle(2, 0xffffff, 0.5).setDepth(25);
    this.oceanDhaFill = this.add.rectangle(357, 351, 10, 108, 0x5ae0d1, 1).setOrigin(0.5, 1).setDepth(26);
    this.oceanDhaText = this.add.text(357, 363, "100%", {
      fontFamily: "system-ui",
      fontSize: "9px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: renderScale
    }).setOrigin(0.5).setDepth(26);
    const pill = this.add.graphics().setPosition(357, 242).setDepth(26);
    pill.fillStyle(0xffffff, 0.16).fillCircle(0, 0, 15);
    pill.fillStyle(0xffca68, 1).fillRoundedRect(-12, -6, 12, 12, 6);
    pill.fillStyle(0x53d7cb, 1).fillRoundedRect(0, -6, 12, 12, 6);
    pill.lineStyle(2, 0xffffff, 0.95).strokeRoundedRect(-12, -6, 24, 12, 6);
    pill.lineStyle(1, 0xffffff, 0.8).lineBetween(0, -5, 0, 5);
    this.oceanVisionFog = this.add.rectangle(195, 350, 390, 700, 0xffffff, 0).setDepth(17);
    this.updateOceanDhaEffects(this.time.now);
  }

  private updateOceanDhaEffects(time: number): void {
    const ratio = Phaser.Math.Clamp(this.oceanDha / 100, 0, 1);
    const color = this.oceanDha < 20 ? 0xef786d : this.oceanDha < 45 ? 0xf0bd58 : 0x5ae0d1;
    this.oceanDhaFill?.setScale(1, ratio).setFillStyle(color, 1);
    this.oceanDhaText?.setText(`${Math.ceil(this.oceanDha)}%`).setColor(this.oceanDha < 20 ? "#ffd4ce" : "#ffffff");
    const shortage = Phaser.Math.Clamp((20 - this.oceanDha) / 20, 0, 1);
    const pulse = shortage > 0 ? (Math.sin(time / 185) + 1) * 0.035 : 0;
    this.oceanVisionFog?.setAlpha(Phaser.Math.Clamp(shortage * 0.88 + pulse, 0, 0.94));
  }

  private endOceanRunForDha(): void {
    if (this.finished) return;
    this.oceanDha = 0;
    this.oceanDhaDepleted = true;
    this.updateOceanDhaEffects(this.time.now);
    this.infoText?.setText(this.gameId === "jump-up" ? "DHA 게이지 소진 · 점프가 종료됐어요." : "DHA 게이지 소진 · 달리기가 종료됐어요.");
    if (this.gameId === "jump-up") this.updateJumpUpHud();
    else this.updateOceanHud();
    this.finish(false);
  }

  private enterOceanChapter(chapter: OceanRunChapterId, immediate: boolean): void {
    const index = OCEAN_RUN_CHAPTERS.findIndex((item) => item.id === chapter);
    if (index < 0) return;
    this.oceanChapterIndex = index;
    const applyChapter = () => {
      if (this.finished) return;
      this.clearOceanWorld();
      this.drawOceanWorld(chapter);
      this.createOceanRunnerAvatar(chapter);
      const chapterInfo = OCEAN_RUN_CHAPTERS[index]!;
      this.oceanChapterText = this.add.text(195, 190, `${chapterInfo.number}  ${chapterInfo.title}`, {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#123b4fc7",
        padding: { x: 12, y: 7 },
        resolution: Number(this.registry.get("render-scale")) || 1
      }).setOrigin(0.5).setDepth(18).setAlpha(immediate ? 1 : 0);
      if (!immediate) {
        this.tweens.add({ targets: this.oceanChapterText, alpha: 1, y: 203, duration: 220, yoyo: true, hold: 850, onComplete: () => this.oceanChapterText?.setAlpha(0) });
      }
      this.oceanTransitioning = false;
      this.updateOceanHud();
    };

    if (immediate) {
      applyChapter();
      return;
    }
    this.oceanTransitioning = true;
    const transitionCopy = chapter === "surf" ? "바다로 점프!" : chapter === "cave" ? "산소통 장착" : "잠수함 도킹";
    const transitionColor = chapter === "surf" ? 0x4fcfd0 : chapter === "cave" ? 0x24365f : 0x07152f;
    const curtain = this.add.rectangle(195, 350, 390, 700, transitionColor, 0).setDepth(40);
    const copy = this.add.text(195, 350, transitionCopy, { fontFamily: "system-ui", fontSize: "24px", fontStyle: "bold", color: "#ffffff", resolution: Number(this.registry.get("render-scale")) || 1 }).setOrigin(0.5).setDepth(41).setAlpha(0);
    if (this.runner) this.tweens.add({ targets: this.runner, y: this.oceanRunnerY - 105, angle: -7, duration: 260, ease: "Quad.easeOut" });
    this.tweens.add({
      targets: [curtain, copy],
      alpha: 1,
      duration: 260,
      onComplete: () => {
        applyChapter();
        this.tweens.add({ targets: [curtain, copy], alpha: 0, duration: 280, onComplete: () => { curtain.destroy(); copy.destroy(); } });
      }
    });
  }

  private clearOceanWorld(): void {
    this.oceanEnvironment.forEach((object) => object.destroy());
    this.oceanAmbient.forEach((object) => object.destroy());
    this.runners.forEach((object) => object.destroy());
    this.runner?.destroy();
    this.oceanChapterText?.destroy();
    this.oceanEnvironment = [];
    this.oceanAmbient = [];
    this.runners = [];
    this.oceanBackground = undefined;
    this.runner = undefined;
    this.oceanChapterText = undefined;
  }

  private keepOcean<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.oceanEnvironment.push(object);
    return object;
  }

  private drawOceanWorld(chapter: OceanRunChapterId): void {
    const texture = {
      beach: "ocean-run-beach",
      surf: "ocean-run-surf",
      cave: "ocean-run-cave",
      deepsea: "ocean-run-deepsea"
    }[chapter];
    const background = this.keepOcean(this.add.image(195, 350, texture).setDisplaySize(390, 700).setDepth(0));
    this.oceanBackground = background;

    const shade = this.add.graphics().setDepth(1);
    const upperShade = chapter === "beach" || chapter === "surf" ? 0x072e3c : 0x020915;
    shade.fillGradientStyle(upperShade, upperShade, upperShade, upperShade, 0.58, 0.58, 0, 0).fillRect(0, 0, 390, 118);
    shade.fillGradientStyle(0x020915, 0x020915, 0x020915, 0x020915, 0, 0, 0.34, 0.34).fillRect(0, 470, 390, 230);
    shade.fillGradientStyle(0x07121c, 0x07121c, 0x07121c, 0x07121c, 0.3, 0, 0.3, 0).fillRect(0, 0, 390, 700);
    this.keepOcean(shade);

    const horizonGlowColor = chapter === "beach" ? 0xfff1b2 : chapter === "surf" ? 0xc9ffff : chapter === "cave" ? 0x67e5db : 0x53aee8;
    this.keepOcean(this.add.ellipse(195, this.oceanHorizonY + 5, 106, 24, horizonGlowColor, chapter === "deepsea" ? 0.12 : 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(2));
    if (chapter === "surf") {
      this.keepOcean(this.add.ellipse(20, 515, 135, 24, 0xffffff, 0.18).setAngle(17).setDepth(2));
      this.keepOcean(this.add.ellipse(370, 485, 150, 25, 0xffffff, 0.18).setAngle(-15).setDepth(2));
    }
    this.createOceanPerspectiveFlow(chapter);
  }

  private createOceanPerspectiveFlow(chapter: OceanRunChapterId): void {
    for (let index = 0; index < 18; index += 1) {
      let parts: Phaser.GameObjects.GameObject[];
      if (chapter === "beach") {
        parts = [this.add.ellipse(0, 0, 9 + index % 4 * 3, 2, index % 3 ? 0xfff3cf : 0xc99f68, 0.75).setAngle(index * 17)];
      } else if (chapter === "surf") {
        parts = [this.add.ellipse(0, 0, 23 + index % 4 * 5, 3, 0xffffff, 0.65), this.add.ellipse(0, -2, 12, 2, 0xbffdf7, 0.7)];
      } else if (chapter === "cave") {
        parts = [this.add.circle(0, 0, 3 + index % 3, 0x8df5e6, 0.2).setStrokeStyle(1, 0xcafff7, 0.65)];
      } else {
        parts = [this.add.circle(0, 0, 2 + index % 3, index % 3 ? 0x6fe7d8 : 0x9d8cff, 0.72).setBlendMode(Phaser.BlendModes.ADD)];
      }
      const flow = this.add.container(195, this.oceanHorizonY, parts)
        .setData("perspective-flow", true)
        .setData("progress", (index + 0.5) / 18)
        .setData("speed", 0.13 + (index % 5) * 0.015)
        .setData("spread", (index % 3 - 1) * (82 + (index % 4) * 13));
      this.oceanAmbient.push(flow);
    }
  }

  private createOceanRunnerAvatar(chapter: OceanRunChapterId): void {
    const x = this.lanes[this.laneIndex] ?? 195;
    if (chapter === "deepsea") {
      this.runner = this.createRearSubmarine(x, this.oceanRunnerY, this.playerPetProfile());
      return;
    }
    this.runner = this.createPetRunner(x, this.oceanRunnerY, chapter, this.playerPetProfile()).setDepth(15);
  }

  private createPetRunner(x: number, y: number, chapter: Exclude<OceanRunChapterId, "deepsea">, profile: PetRenderProfile): Phaser.GameObjects.Container {
    const surfing = chapter === "surf";
    const diving = chapter === "cave";
    const breed = breedDefinition(profile.breed);
    const shadow = this.add.ellipse(0, 49, surfing ? 104 : 88, surfing ? 17 : 21, 0x031e29, surfing ? 0.22 : 0.3);
    const body = this.add.ellipse(0, -24, breed.size === "large" ? 88 : 76, 82, profile.outfit === "none" ? profile.fur : profile.outfitColor).setStrokeStyle(3, 0xffffff, 0.27);
    const rump = this.add.ellipse(0, 5, 72, 48, profile.fur).setStrokeStyle(2, profile.accent, profile.pattern === "solid" ? 0.1 : 0.5);
    const head = this.add.ellipse(0, -78, 67, 63, profile.fur).setStrokeStyle(2, 0xffffff, 0.24);
    const earParts: Phaser.GameObjects.GameObject[] = breed.ears === "drop"
      ? [this.add.ellipse(-34, -78, 22, 53, profile.fur).setAngle(8), this.add.ellipse(34, -78, 22, 53, profile.fur).setAngle(-8)]
      : [this.add.triangle(-24, -101, -15, 20, 0, -22, 15, 20, profile.fur), this.add.triangle(24, -101, -15, 20, 0, -22, 15, 20, profile.fur)];
    const tail = profile.species === "cat"
      ? this.add.arc(27, -12, 43, 220, 65, false, 0x000000, 0).setStrokeStyle(12, profile.fur)
      : this.add.ellipse(37, -30, 48, breed.coat === "fluffy" ? 22 : 15, profile.fur).setAngle(-36);
    const makeLeg = (side: -1 | 1, front: boolean) => {
      const limb = this.add.container(side * (front ? 27 : 20), front ? -10 : 8);
      const leg = this.add.graphics();
      const legHeight = surfing ? 28 : front ? 38 : 34;
      leg.fillStyle(profile.fur).fillRoundedRect(-10, 17, 20, legHeight, 10);
      leg.fillStyle(0xffffff, 0.11).fillRoundedRect(-6, 21, 5, legHeight - 8, 3);
      leg.lineStyle(1.5, profile.accent, 0.22).strokeRoundedRect(-10, 17, 20, legHeight, 10);
      limb.add(leg);
      limb.add(this.add.ellipse(0, 17 + legHeight, 29, 17, diving ? 0x4bc9c2 : profile.fur).setStrokeStyle(1.5, 0xffffff, 0.22));
      return limb;
    };
    const frontLeft = makeLeg(-1, true);
    const frontRight = makeLeg(1, true);
    const backLeft = makeLeg(-1, false);
    const backRight = makeLeg(1, false);
    const torso = this.add.container(0, 0, [tail, rump, body, ...earParts, head]);
    if (profile.pattern === "tabby") torso.add([this.add.rectangle(-12, -91, 7, 23, profile.accent).setAngle(-10), this.add.rectangle(0, -94, 7, 25, profile.accent), this.add.rectangle(12, -91, 7, 23, profile.accent).setAngle(10)]);
    if (profile.pattern === "spotted") torso.add([this.add.circle(-22, -37, 9, profile.accent), this.add.circle(21, -10, 7, profile.accent)]);
    if (profile.hat !== "none") {
      const hatColor = profile.hat === "cap" ? 0x3b8490 : profile.hat === "beanie" ? 0xef7c6e : 0xe5c270;
      torso.add(this.add.ellipse(0, -110, profile.hat === "sunhat" ? 92 : 62, profile.hat === "beanie" ? 32 : 20, hatColor));
      if (profile.hat === "cap") torso.add(this.add.ellipse(23, -103, 42, 9, 0x2d6975));
    }

    const parts: Phaser.GameObjects.GameObject[] = [shadow];
    if (chapter === "beach") {
      const leftDust = this.add.ellipse(-15, 56, 42, 12, 0xfff2cd, 0.34);
      const rightDust = this.add.ellipse(15, 56, 42, 12, 0xfff2cd, 0.22);
      const board = this.add.image(-57, -29, "ocean-run-surfboard").setDisplaySize(82, 136).setAngle(-14);
      const boardShadow = this.add.ellipse(-53, -19, 40, 118, 0x071d25, 0.22).setAngle(-14);
      parts.push(leftDust, rightDust, boardShadow, board);
      this.tweens.add({ targets: leftDust, scaleX: 1.5, alpha: 0.08, duration: 280, yoyo: true, repeat: -1, ease: "Sine.easeOut" });
      this.tweens.add({ targets: rightDust, scaleX: 1.6, alpha: 0.06, duration: 280, delay: 140, yoyo: true, repeat: -1, ease: "Sine.easeOut" });
    }
    if (surfing) {
      const boardGlow = this.add.ellipse(0, 36, 90, 145, 0x8efff2, 0.14).setBlendMode(Phaser.BlendModes.ADD);
      const board = this.add.image(0, 39, "ocean-run-surfboard").setDisplaySize(94, 166);
      const wake = this.add.ellipse(0, 65, 130, 24, 0xffffff, 0.58).setStrokeStyle(3, 0xb9fff7, 0.62);
      parts.push(boardGlow, wake, board);
      torso.setY(9).setScale(0.9);
      frontLeft.setAngle(-35).setPosition(-31, -31);
      frontRight.setAngle(35).setPosition(31, -31);
      backLeft.setAngle(-15).setPosition(-14, 2);
      backRight.setAngle(15).setPosition(14, 2);
    }
    if (diving) {
      const tank = this.add.rectangle(0, -41, 30, 79, 0x38a9a5).setStrokeStyle(4, 0xbffff5, 0.72);
      const tankTop = this.add.ellipse(0, -81, 30, 12, 0x96eee4).setStrokeStyle(2, 0xd7fff9, 0.7);
      const straps = this.add.graphics().lineStyle(5, 0x173d48, 0.75).beginPath().arc(0, -51, 29, -1.1, 1.1).strokePath().beginPath().arc(0, -24, 29, -1.1, 1.1).strokePath();
      parts.push(tank, tankTop, straps);
    }
    parts.push(backLeft, backRight, torso, frontLeft, frontRight);
    const runner = this.add.container(x, y, parts).setScale(surfing ? 0.88 : diving ? 0.8 : 0.86).setDepth(15);
    this.tweens.add({ targets: [frontLeft, backRight], angle: surfing ? -10 : 24, duration: surfing ? 320 : 125, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: [frontRight, backLeft], angle: surfing ? 10 : -24, duration: surfing ? 320 : 125, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: torso, y: torso.y - (surfing ? 2 : 4), angle: surfing ? 2.4 : 1.2, duration: surfing ? 410 : 145, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return runner;
  }

  private createRearSubmarine(x: number, y: number, profile: PetRenderProfile): Phaser.GameObjects.Container {
    const hull = this.add.ellipse(0, -10, 122, 92, 0xe9b94b).setStrokeStyle(5, 0xfff0a7, 0.86);
    const hullShade = this.add.ellipse(19, 1, 76, 65, 0x8f5c32, 0.18);
    const rearGlass = this.add.ellipse(0, -24, 57, 40, 0x16546e).setStrokeStyle(4, 0x8effef, 0.75);
    const glassGlow = this.add.ellipse(-9, -33, 23, 12, 0xd8ffff, 0.26);
    const petHead = this.add.ellipse(0, -23, 35, 30, profile.fur).setStrokeStyle(2, 0xffffff, 0.28);
    const petEars = breedDefinition(profile.breed).ears === "drop"
      ? [this.add.ellipse(-15, -23, 10, 25, profile.fur), this.add.ellipse(15, -23, 10, 25, profile.fur)]
      : [this.add.triangle(-12, -35, -7, 11, 0, -13, 8, 11, profile.fur), this.add.triangle(12, -35, -7, 11, 0, -13, 8, 11, profile.fur)];
    const leftThruster = this.add.circle(-46, 19, 19, 0x173848).setStrokeStyle(4, 0x72d8cf, 0.75);
    const rightThruster = this.add.circle(46, 19, 19, 0x173848).setStrokeStyle(4, 0x72d8cf, 0.75);
    const leftPropeller = this.add.container(-46, 19, [this.add.rectangle(0, 0, 5, 33, 0xb9eee7), this.add.rectangle(0, 0, 33, 5, 0xb9eee7)]);
    const rightPropeller = this.add.container(46, 19, [this.add.rectangle(0, 0, 5, 33, 0xb9eee7), this.add.rectangle(0, 0, 33, 5, 0xb9eee7)]);
    const fin = this.add.triangle(0, -62, -18, 15, 0, -18, 18, 15, 0xe47864).setStrokeStyle(2, 0xffc2ad, 0.75);
    const leftLight = this.add.circle(-34, -7, 7, 0x8ffff0).setBlendMode(Phaser.BlendModes.ADD);
    const rightLight = this.add.circle(34, -7, 7, 0x8ffff0).setBlendMode(Phaser.BlendModes.ADD);
    const runner = this.add.container(x, y, [this.add.ellipse(0, 42, 130, 28, 0x020b18, 0.35), fin, hull, hullShade, rearGlass, ...petEars, petHead, glassGlow, leftThruster, rightThruster, leftPropeller, rightPropeller, leftLight, rightLight]).setDepth(15).setScale(0.9);
    this.tweens.add({ targets: leftPropeller, angle: 360, duration: 180, repeat: -1 });
    this.tweens.add({ targets: rightPropeller, angle: -360, duration: 180, repeat: -1 });
    this.tweens.add({ targets: [leftLight, rightLight], alpha: 0.35, duration: 480, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: runner, angle: 1.5, duration: 620, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return runner;
  }

  private spawnOceanObject(): void {
    if (this.finished || this.oceanTransitioning) return;
    const chapter = OCEAN_RUN_CHAPTERS[this.oceanChapterIndex]?.id ?? "beach";
    const lane = Phaser.Math.Between(0, 2);
    const collectible = this.time.now >= this.oceanNextDhaAt;
    if (collectible) this.oceanNextDhaAt = this.time.now + Phaser.Math.Between(4_400, 6_000);
    let parts: Phaser.GameObjects.GameObject[];
    let label = "장애물";
    if (collectible) {
      const capsule = this.add.graphics();
      capsule.fillStyle(0xffca68, 1).fillRoundedRect(-28, -14, 28, 28, 14);
      capsule.fillStyle(0x53d7cb, 1).fillRoundedRect(0, -14, 28, 28, 14);
      capsule.lineStyle(4, 0xffffff, 0.96).strokeRoundedRect(-28, -14, 56, 28, 14);
      capsule.lineStyle(2, 0xffffff, 0.82).lineBetween(0, -12, 0, 12);
      parts = [
        this.add.circle(0, 2, 43, 0x8ff5e8, 0.25).setBlendMode(Phaser.BlendModes.ADD),
        capsule,
        this.add.text(0, 1, "DHA", { fontFamily: "system-ui", fontSize: "10px", fontStyle: "bold", color: "#123a46", resolution: Number(this.registry.get("render-scale")) || 1 }).setOrigin(0.5)
      ];
      label = "DHA 알약";
    } else if (chapter === "beach") {
      parts = [this.add.ellipse(0, 26, 150, 26, 0x281710, 0.28), this.add.image(0, -15, "ocean-run-palm").setDisplaySize(176, 99)];
      label = "야자수";
    } else if (chapter === "surf") {
      if (Math.random() < 0.5) {
        parts = [
          this.add.ellipse(0, 22, 104, 17, 0x052d42, 0.24),
          this.add.ellipse(0, 17, 105, 15, 0xffffff, 0.72),
          this.add.ellipse(0, 19, 78, 7, 0x68e2dc, 0.62),
          this.add.polygon(0, -3, [-31, 23, -10, -9, 0, -43, 14, -6, 32, 23], 0x173d50).setStrokeStyle(3, 0x9cded8, 0.7),
          this.add.polygon(3, -9, [-7, 13, 1, -24, 8, 12], 0x426a78, 0.7)
        ];
        label = "상어";
      } else {
        parts = [
          this.add.circle(0, 2, 58, 0xb68ce9, 0.16).setBlendMode(Phaser.BlendModes.ADD),
          this.add.ellipse(0, -13, 76, 52, 0xc698ee, 0.88).setStrokeStyle(4, 0xf0ddff, 0.78),
          this.add.ellipse(-13, -23, 25, 11, 0xffffff, 0.3),
          ...[-25, -13, 0, 13, 25].map((x, index) => this.add.line(0, 0, x, 5, x + (index % 2 ? 10 : -10), 62 + index % 3 * 7, index % 2 ? 0x70e1db : 0xc69cf0, 0.92).setOrigin(0))
        ];
        label = "해파리";
      }
    } else if (chapter === "cave") {
      if (Math.random() < 0.5) {
        parts = [
          this.add.ellipse(0, 27, 100, 24, 0x020a12, 0.46),
          this.add.polygon(0, 0, [-51, 31, -38, -18, -19, -51, 2, -23, 22, -62, 38, -21, 53, 31], 0x2c3c4a).setStrokeStyle(3, 0x76c7bd, 0.46),
          this.add.polygon(-14, -5, [-27, 24, -19, -18, 2, -39, 9, 20], 0x52636d, 0.72),
          this.add.circle(18, -16, 5, 0x77e6d4, 0.5).setBlendMode(Phaser.BlendModes.ADD)
        ];
        label = "동굴 암초";
      } else {
        parts = [
          this.add.ellipse(0, 24, 78, 19, 0x1c5661, 0.76).setStrokeStyle(2, 0x73d9ca, 0.56),
          ...Array.from({ length: 6 }, (_, index) => this.add.circle((index % 2 ? 1 : -1) * (7 + index * 2), 8 - index * 14, 5 + index % 3, 0x91f7e8, 0.25).setStrokeStyle(1, 0xd5fff8, 0.72))
        ];
        label = "해류 분출";
      }
    } else if (Math.random() < 0.5) {
      parts = [
        this.add.circle(0, 0, 34, 0x8b6a98, 0.16).setBlendMode(Phaser.BlendModes.ADD),
        this.add.circle(0, 0, 22, 0x473854).setStrokeStyle(4, 0xb485b8, 0.76),
        this.add.circle(-7, -7, 5, 0x8ffff0, 0.55),
        ...Array.from({ length: 10 }, (_, index) => this.add.triangle(Math.cos(index * Math.PI / 5) * 31, Math.sin(index * Math.PI / 5) * 31, -7, 9, 0, -13, 7, 9, 0x9a6a9f).setAngle(index * 36))
      ];
      label = "심해 기뢰";
    } else {
      parts = [
        this.add.ellipse(0, -9, 58, 41, 0x8f75ca, 0.83).setStrokeStyle(3, 0xded2ff, 0.72),
        this.add.ellipse(-10, -17, 20, 9, 0xffffff, 0.22),
        ...[-19, -7, 7, 19].map((x, index) => this.add.line(0, 0, x, 7, x + (index % 2 ? 7 : -7), 53 + index * 3, index % 2 ? 0x72ded6 : 0xb698e5, 0.85).setOrigin(0))
      ];
      label = "해파리";
    }
    const object = this.add.container(195, this.oceanHorizonY, parts).setDepth(9).setScale(0.07);
    object.setData("collectible", collectible)
      .setData("speed", Phaser.Math.FloatBetween(0.9, 1.14))
      .setData("label", label)
      .setData("lane", lane)
      .setData("path-progress", 0);
    this.runners.push(object);
  }

  private removeOceanObject(object: Phaser.GameObjects.Container): void {
    object.destroy();
    this.runners = this.runners.filter((item) => item !== object);
  }

  private jumpOceanRunner(): void {
    if (!this.runner || this.oceanJumping || this.oceanTransitioning || this.finished) return;
    this.oceanJumping = true;
    const chapter = OCEAN_RUN_CHAPTERS[this.oceanChapterIndex]?.id;
    this.tweens.killTweensOf(this.runner);
    this.tweens.add({
      targets: this.runner,
      y: this.oceanRunnerY - (chapter === "deepsea" ? 72 : 92),
      scaleX: chapter === "deepsea" ? 1.08 : this.runner.scaleX,
      duration: 240,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (this.runner) this.runner.y = this.oceanRunnerY;
        this.oceanJumping = false;
      }
    });
  }

  private updateOceanHud(): void {
    const chapter = OCEAN_RUN_CHAPTERS[this.oceanChapterIndex] ?? OCEAN_RUN_CHAPTERS[0]!;
    const distance = Math.floor(this.oceanDistance);
    this.scoreText?.setText(`${chapter.number} ${chapter.title} · ${distance} m · ${Math.floor(this.score)}점`);
    if (!this.oceanTransitioning && !this.finished) this.infoText?.setText(`체력 ${"●".repeat(this.health)}${"○".repeat(3 - this.health)} · 좌우 이동 · 점프`);
    gameBridge.emit("minigame:progress", {
      gameId: this.gameId,
      score: Math.floor(this.score),
      playerPoints: this.oceanChapterIndex + 1,
      computerPoints: distance,
      dha: Math.ceil(this.oceanDha)
    });
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
      durationMs: Math.max(500, Math.floor(this.time.now - this.startedAt)),
      endReason: this.oceanDhaDepleted ? "dha-depleted" : undefined
    };
    this.scene.pause();
    gameBridge.emit("minigame:finish", result);
  }

  private successAtTimeout(): boolean {
    if (this.gameId === "ocean-run") return this.oceanChapterIndex === 3;
    if (this.gameId === "jump-up") return this.jumpPhaseIndex === 3;
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
