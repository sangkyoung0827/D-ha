import { useEffect, useState } from "react";
import type { MiniGameResult } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { calculateMiniGameReward } from "../../domain/economy";
import { isOceanGame } from "../../domain/ocean";

export function MiniGameOverlay({ id, result, debug, onClaim, onExit }: { id: MiniGameResult["gameId"]; result: MiniGameResult | null; debug: boolean; onClaim(result: MiniGameResult): void; onExit(): void }) {
  const [liveScore, setLiveScore] = useState<{ score: number; playerPoints: number; computerPoints: number; dha?: number } | null>(null);
  useEffect(() => {
    return gameBridge.on("minigame:progress", (progress) => {
      if (progress.gameId === id) setLiveScore(progress);
    });
  }, [id]);
  if (result) {
    const reward = calculateMiniGameReward(result);
    const dhaDepleted = (id === "ocean-run" || id === "jump-up") && result.endReason === "dha-depleted";
    const resultTitle = id === "ocean-run" ? result.success ? "심해 탐험 완주!" : dhaDepleted ? "DHA 게이지가 모두 소진됐어요" : "탐험 기록을 세웠어요" : id === "jump-up" ? result.success ? "우주에 도착했어요!" : dhaDepleted ? "DHA 게이지가 모두 소진됐어요" : "최고 고도를 기록했어요" : result.success ? "멋진 항해였어요!" : "다음 해류에서 다시 만나요";
    return <div className="minigame-result" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-medal">{dhaDepleted ? "DHA" : result.success ? "✦" : id === "jump-up" ? "↑" : "≈"}</div><p className="eyebrow">{id === "ocean-run" ? "OCEAN RUN COMPLETE" : id === "jump-up" ? "JUMP UP COMPLETE" : "CURRENT COMPLETE"}</p><h2 id="result-title">{resultTitle}</h2><strong>{result.score.toLocaleString()}점</strong>{dhaDepleted && <div className="ocean-gate-result"><strong>게임 중 나타나는 DHA 알약을 놓치지 마세요.</strong><small>알약을 먹으면 게이지와 시야가 즉시 회복돼요.</small></div>}<div className="reward-row"><span>● {reward.coins} 코인</span><span>↑ {reward.xp} XP</span></div><button className="primary-button wide" data-testid="claim-reward" onClick={() => onClaim(result)}>{isOceanGame(id) ? "보상 받고 바다로" : "보상 받고 게임룸으로"}</button></div>;
  }
  const dhaGame = id === "ocean-run" || id === "jump-up";
  const lowDha = dhaGame && (liveScore?.dha ?? 100) < 20;
  return <>
    <button className="minigame-back-button" type="button" aria-label="게임에서 나가기" onClick={onExit}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
    </button>
    {liveScore && <span className="sr-only" role="status" data-testid="minigame-live-score">{id === "ocean-run" ? `챕터 ${liveScore.playerPoints}, 거리 ${liveScore.computerPoints}미터, 점수 ${liveScore.score}, DHA ${liveScore.dha ?? 100}퍼센트` : id === "jump-up" ? `단계 ${liveScore.playerPoints}, 고도 ${liveScore.computerPoints}미터, 점수 ${liveScore.score}, DHA ${liveScore.dha ?? 100}퍼센트` : `내 점수 ${liveScore.score}, 나 ${liveScore.playerPoints}, 컴퓨터 ${liveScore.computerPoints}`}</span>}
    {lowDha && <span className="sr-only" data-testid="dha-vision-warning">DHA 부족 · 시야 흐림</span>}
    {debug && <div className="minigame-test-controls" aria-hidden="true">
      {dhaGame && <>
        <button type="button" tabIndex={-1} data-testid="debug-dha-low" onClick={() => gameBridge.emit("minigame:debug-dha", { value: 15 })}>DHA 저하 테스트</button>
        <button type="button" tabIndex={-1} data-testid="debug-dha-recover" onClick={() => gameBridge.emit("minigame:debug-dha", { value: 70 })}>DHA 회복 테스트</button>
        <button type="button" tabIndex={-1} data-testid="debug-dha-empty" onClick={() => gameBridge.emit("minigame:debug-dha", { value: 0 })}>DHA 소진 테스트</button>
      </>}
      {id === "jump-up" && <button type="button" tabIndex={-1} data-testid="debug-jump-space" onClick={() => gameBridge.emit("minigame:debug-jump-space", undefined)}>우주 단계 테스트</button>}
      <button type="button" tabIndex={-1} data-testid="debug-finish-game" onClick={() => gameBridge.emit("minigame:demo-finish", undefined)}>데모 완료</button>
    </div>}
  </>;
}
