import { useEffect, useState } from "react";
import type { MiniGameDefinition, MiniGameResult } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { calculateMiniGameReward } from "../../domain/economy";
import { loadMiniGameDefinition } from "../../minigames/core/loadDefinition";
import { isOceanGame } from "../../domain/ocean";
import { useGameStore } from "../../store/gameStore";

export function MiniGameOverlay({ id, result, debug, onClaim, onExit }: { id: MiniGameResult["gameId"]; result: MiniGameResult | null; debug: boolean; onClaim(result: MiniGameResult): void; onExit(): void }) {
  const [definition, setDefinition] = useState<MiniGameDefinition | null>(null);
  const [paused, setPaused] = useState(false);
  const [liveScore, setLiveScore] = useState<{ score: number; playerPoints: number; computerPoints: number; dha?: number } | null>(null);
  const inventory = useGameStore((state) => state.inventory);
  useEffect(() => { void loadMiniGameDefinition(id).then(setDefinition); }, [id]);
  useEffect(() => {
    return gameBridge.on("minigame:progress", (progress) => {
      if (progress.gameId === id) setLiveScore(progress);
    });
  }, [id]);
  if (result) {
    const reward = calculateMiniGameReward(result);
    const dhaDepleted = (id === "ocean-run" || id === "jump-up") && result.endReason === "dha-depleted";
    const oceanGate = id === "ocean-run" && !dhaDepleted && !result.success && result.durationMs >= 23_000
      ? (inventory["ocean-oxygen-tank"] ?? 0) < 1
        ? { title: "해저 동굴 앞에 도착!", copy: "상점에서 산소통을 준비하면 동굴 챕터로 이어져요.", icon: "O₂" }
        : result.durationMs >= 35_000 && (inventory["ocean-submarine"] ?? 0) < 1
          ? { title: "심해 입구까지 돌파!", copy: "상점의 잠수함을 준비하면 마지막 심해 챕터가 열려요.", icon: "◉" }
          : null
      : null;
    const resultTitle = id === "ocean-run" ? result.success ? "심해 탐험 완주!" : dhaDepleted ? "DHA 게이지가 모두 소진됐어요" : oceanGate?.title ?? "탐험 기록을 세웠어요" : id === "jump-up" ? result.success ? "우주에 도착했어요!" : dhaDepleted ? "DHA 게이지가 모두 소진됐어요" : "최고 고도를 기록했어요" : result.success ? "멋진 항해였어요!" : "다음 해류에서 다시 만나요";
    return <div className="minigame-result" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-medal">{dhaDepleted ? "DHA" : oceanGate?.icon ?? (result.success ? "✦" : id === "jump-up" ? "↑" : "≈")}</div><p className="eyebrow">{id === "ocean-run" ? "OCEAN RUN COMPLETE" : id === "jump-up" ? "JUMP UP COMPLETE" : "CURRENT COMPLETE"}</p><h2 id="result-title">{resultTitle}</h2><strong>{result.score.toLocaleString()}점</strong>{dhaDepleted && <div className="ocean-gate-result"><strong>게임 중 나타나는 DHA 알약을 놓치지 마세요.</strong><small>알약을 먹으면 게이지와 시야가 즉시 회복돼요.</small></div>}{oceanGate && <div className="ocean-gate-result"><strong>{oceanGate.copy}</strong><small>보상을 받은 뒤 Ocean 상점을 열어 준비할 수 있어요.</small></div>}<div className="reward-row"><span>● {reward.coins} 코인</span><span>↑ {reward.xp} XP</span></div><button className="primary-button wide" data-testid="claim-reward" onClick={() => onClaim(result)}>{isOceanGame(id) ? "보상 받고 바다로" : "보상 받고 게임룸으로"}</button></div>;
  }
  const dhaGame = id === "ocean-run" || id === "jump-up";
  const laneGame = id === "current-run" || id === "ocean-run" || id === "jump-up" || id === "reef-surf" || id === "deepsea-descent";
  const actionLabel = id === "ocean-run" ? "점프 / 상승" : id === "jump-up" ? "점프 부스트" : id === "beach-pingpong" ? "탁구공 치기" : id === "beach-volleyball" ? "공 받기" : id === "beach-football" ? "슛" : null;
  const lowDha = dhaGame && (liveScore?.dha ?? 100) < 20;
  return <aside className="minigame-controls" aria-label="미니게임 접근성 컨트롤"><div><p className="eyebrow">PLAYING</p><strong>{definition?.title ?? "게임 준비 중"}</strong>{dhaGame && liveScore && <small className={`runner-live-chip${lowDha ? " is-low" : ""}`}>{id === "jump-up" ? `ST ${liveScore.playerPoints} · ${liveScore.computerPoints.toLocaleString()} m` : `CH ${liveScore.playerPoints} · ${liveScore.computerPoints} m`} · DHA {liveScore.dha ?? 100}%</small>}{lowDha && <small className="dha-vision-warning" data-testid="dha-vision-warning">DHA 부족 · 시야 흐림</small>}{liveScore && <span className="sr-only" role="status" data-testid="minigame-live-score">{id === "ocean-run" ? `챕터 ${liveScore.playerPoints}, 거리 ${liveScore.computerPoints}미터, 점수 ${liveScore.score}, DHA ${liveScore.dha ?? 100}퍼센트` : id === "jump-up" ? `단계 ${liveScore.playerPoints}, 고도 ${liveScore.computerPoints}미터, 점수 ${liveScore.score}, DHA ${liveScore.dha ?? 100}퍼센트` : `내 점수 ${liveScore.score}, 나 ${liveScore.playerPoints}, 컴퓨터 ${liveScore.computerPoints}`}</span>}</div><div className="control-buttons">{laneGame && <><button onClick={() => gameBridge.emit("minigame:move", { direction: -1 })} aria-label="왼쪽 레인 이동">←</button><button onClick={() => gameBridge.emit("minigame:move", { direction: 1 })} aria-label="오른쪽 레인 이동">→</button></>}{actionLabel && <button className="minigame-action" data-testid="minigame-action" onClick={() => gameBridge.emit("minigame:action", undefined)}>{actionLabel}</button>}<button onClick={() => { gameBridge.emit(paused ? "minigame:resume" : "minigame:pause", undefined); setPaused(!paused); }}>{paused ? "계속" : "일시정지"}</button><button onClick={() => gameBridge.emit("minigame:restart", undefined)}>다시</button>{debug && dhaGame && <><button onClick={() => gameBridge.emit("minigame:debug-dha", { value: 15 })}>DHA 저하 테스트</button><button onClick={() => gameBridge.emit("minigame:debug-dha", { value: 70 })}>DHA 회복 테스트</button><button onClick={() => gameBridge.emit("minigame:debug-dha", { value: 0 })}>DHA 소진 테스트</button></>}{debug && id === "jump-up" && <button onClick={() => gameBridge.emit("minigame:debug-jump-space", undefined)}>우주 단계 테스트</button>}{debug && <button onClick={() => gameBridge.emit("minigame:demo-finish", undefined)}>데모 완료</button>}<button onClick={onExit}>나가기</button></div></aside>;
}
