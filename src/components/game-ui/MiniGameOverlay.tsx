import { useEffect, useState } from "react";
import type { MiniGameDefinition, MiniGameResult } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";
import { calculateMiniGameReward } from "../../domain/economy";
import { loadMiniGameDefinition } from "../../minigames/core/loadDefinition";

export function MiniGameOverlay({ id, result, debug, onClaim, onExit }: { id: MiniGameResult["gameId"]; result: MiniGameResult | null; debug: boolean; onClaim(result: MiniGameResult): void; onExit(): void }) {
  const [definition, setDefinition] = useState<MiniGameDefinition | null>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => { void loadMiniGameDefinition(id).then(setDefinition); }, [id]);
  if (result) {
    const reward = calculateMiniGameReward(result);
    return <div className="minigame-result" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-medal">{result.success ? "✦" : "≈"}</div><p className="eyebrow">CURRENT COMPLETE</p><h2 id="result-title">{result.success ? "멋진 항해였어요!" : "다음 해류에서 다시 만나요"}</h2><strong>{result.score.toLocaleString()}점</strong><div className="reward-row"><span>● {reward.coins} 코인</span><span>↑ {reward.xp} XP</span></div><button className="primary-button wide" data-testid="claim-reward" onClick={() => onClaim(result)}>보상 받고 게임룸으로</button></div>;
  }
  return <aside className="minigame-controls" aria-label="미니게임 접근성 컨트롤"><div><p className="eyebrow">PLAYING</p><strong>{definition?.title ?? "게임 준비 중"}</strong></div><div className="control-buttons">{id === "current-run" && <><button onClick={() => gameBridge.emit("minigame:move", { direction: -1 })} aria-label="왼쪽 레인 이동">←</button><button onClick={() => gameBridge.emit("minigame:move", { direction: 1 })} aria-label="오른쪽 레인 이동">→</button></>}<button onClick={() => { gameBridge.emit(paused ? "minigame:resume" : "minigame:pause", undefined); setPaused(!paused); }}>{paused ? "계속" : "일시정지"}</button><button onClick={() => gameBridge.emit("minigame:restart", undefined)}>다시</button>{debug && <button onClick={() => gameBridge.emit("minigame:demo-finish", undefined)}>데모 완료</button>}<button onClick={onExit}>나가기</button></div></aside>;
}
