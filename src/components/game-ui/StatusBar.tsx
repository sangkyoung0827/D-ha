import { needState } from "../../domain/balance";
import { keeperRank, xpProgress } from "../../domain/progression";
import type { NeedKey, NeedValues } from "../../domain/types";

const NEEDS: Array<{ key: NeedKey; label: string; mark: string }> = [
  { key: "satiety", label: "포만감", mark: "◒" },
  { key: "hygiene", label: "청결", mark: "✦" },
  { key: "energy", label: "에너지", mark: "ϟ" },
  { key: "joy", label: "즐거움", mark: "♥" },
  { key: "condition", label: "컨디션", mark: "◎" }
];

export function StatusBar({ needs, coins, xp, level, onDaily, onNotifications }: { needs: NeedValues; coins: number; xp: number; level: number; onDaily(): void; onNotifications(): void }) {
  const progress = xpProgress(xp);
  return (
    <header className="status-shell">
      <div className="identity-row"><div><span className="level-chip">LV.{level}</span><strong>{keeperRank(level)}</strong></div><button className="coin-chip" onClick={onDaily} aria-label={`${coins} 코인, 일일 목표 열기`}><i>●</i>{coins.toLocaleString()}</button><button className="notification-button" onClick={onNotifications} aria-label="알림 센터 열기">◌</button></div>
      <div className="xp-track" aria-label={`경험치 ${progress.current}/${progress.required}`}><span style={{ width: `${progress.ratio * 100}%` }} /></div>
      <div className="needs-row">{NEEDS.map(({ key, label, mark }) => <div key={key} className={`need-pill need-${needState(needs[key]).replace(" ", "-")}`} title={`${label} ${Math.round(needs[key])}`} aria-label={`${label} ${Math.round(needs[key])}`}><b>{mark}</b><span><small>{label}</small><i><em style={{ width: `${needs[key]}%` }} /></i></span><strong>{Math.round(needs[key])}</strong></div>)}</div>
    </header>
  );
}
