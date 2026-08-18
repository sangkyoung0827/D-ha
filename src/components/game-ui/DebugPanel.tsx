import { useState } from "react";
import { gameBridge } from "../../game/bridge/GameBridge";
import { useGameStore } from "../../store/gameStore";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const overlay = useGameStore((state) => state.overlay);
  const needs = useGameStore((state) => state.needs);
  const demoAdvance = useGameStore((state) => state.demoAdvance);
  const demoSetNeeds = useGameStore((state) => state.demoSetNeeds);
  const demoAddCoins = useGameStore((state) => state.demoAddCoins);
  const demoSetLevel = useGameStore((state) => state.demoSetLevel);
  const demoUnlockAll = useGameStore((state) => state.demoUnlockAll);
  const demoResetAchievements = useGameStore((state) => state.demoResetAchievements);
  const demoTestNotification = useGameStore((state) => state.demoTestNotification);
  const setOverlay = useGameStore((state) => state.setOverlay);
  const notifications = useGameStore((state) => state.notifications);
  const lastSavedAt = useGameStore((state) => state.lastSavedAt);
  const version = useGameStore((state) => state.version);
  if (overlay !== "none") return null;
  return <aside className={`debug-panel ${open ? "open" : ""}`}><button className="debug-toggle" onClick={() => setOpen(!open)}>DEV</button>{open && <div><header><strong>Domain Demo Console</strong><small>?debug=1</small></header><section><h3>시간 경과</h3><div className="debug-row"><button data-testid="advance-1h" onClick={() => demoAdvance(1)}>+1시간</button><button onClick={() => demoAdvance(24)}>+1일</button><button onClick={() => demoAdvance(72)}>+3일</button><button onClick={() => demoAdvance(24)}>오프라인 복귀 24h</button></div></section><section><h3>상태 조절</h3>{(["satiety", "hygiene", "energy", "joy"] as const).map((key) => <label key={key}>{key}<input type="range" min="0" max="100" value={needs[key]} onChange={(event) => demoSetNeeds({ [key]: Number(event.target.value) })} /><b>{Math.round(needs[key])}</b></label>)}</section><section><h3>경제·성장</h3><div className="debug-row"><button onClick={() => demoAddCoins(1000)}>+1000 코인</button><select aria-label="데모 레벨" defaultValue="1" onChange={(event) => { demoSetLevel(Number(event.target.value)); gameBridge.emit("keeper:react", { action: "level" }); }}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}</select></div><button onClick={demoUnlockAll}>모든 아이템 해금</button><button onClick={demoResetAchievements}>업적 초기화</button><button onClick={demoTestNotification}>알림 테스트</button><button onClick={() => setOverlay("settings")}>설정 열기</button></section><section><h3>애니메이션 테스트</h3><div className="debug-row">{(["feed", "wash", "sleep", "wellness", "play", "level"] as const).map((action) => <button key={action} onClick={() => gameBridge.emit("keeper:react", { action })}>{action}</button>)}</div></section><footer>저장 v{version} · {new Date(lastSavedAt).toLocaleString("ko-KR")}<br />알림 {notifications.length}개 · IndexedDB 실제 도메인 경로</footer></div>}</aside>;
}
