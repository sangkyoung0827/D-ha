import { needState } from "../../domain/balance";
import type { NeedKey, NeedValues } from "../../domain/types";
import { GameIcon, type GameIconName } from "../icons/GameIcon";

const NEEDS: Array<{ key: NeedKey; label: string; icon: GameIconName }> = [
  { key: "satiety", label: "식사", icon: "food" },
  { key: "hygiene", label: "청결", icon: "water" },
  { key: "energy", label: "에너지", icon: "energy" },
  { key: "joy", label: "기분", icon: "heart" },
  { key: "condition", label: "컨디션", icon: "sparkles" }
];

export function StatusBar({ needs, level, onDaily, onNotifications, onSettings }: { needs: NeedValues; level: number; onDaily(): void; onNotifications(): void; onSettings(): void }) {
  return (
    <header className="status-shell">
      <div className="brand-lockup"><i aria-hidden="true"><span /></i><strong>알고케어</strong><span className="level-chip">LV {String(level).padStart(2, "0")}</span></div>
      <div className="needs-row" aria-label="Keeper 상태">{NEEDS.map(({ key, label, icon }) => <div key={key} className={`need-indicator need-${needState(needs[key]).replace(" ", "-")}`} title={label} aria-label={`${label} ${Math.round(needs[key])}, 상태 ${needState(needs[key])}`}><GameIcon name={icon} /></div>)}</div>
      <div className="utility-actions"><button onClick={onDaily} aria-label="오늘의 목표"><GameIcon name="target" /></button><button onClick={onNotifications} aria-label="알림 센터 열기"><GameIcon name="bell" /></button><button onClick={onSettings} aria-label="설정 열기"><GameIcon name="settings" /></button></div>
    </header>
  );
}
