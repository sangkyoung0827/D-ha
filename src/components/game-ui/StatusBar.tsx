import { needState } from "../../domain/balance";
import type { NeedValues } from "../../domain/types";
import { GameIcon, type GameIconName } from "../icons/GameIcon";

const NEEDS: Array<{ key: keyof NeedValues; label: string; icon: GameIconName }> = [
  { key: "satiety", label: "밥", icon: "food" },
  { key: "condition", label: "영양제", icon: "sparkles" },
  { key: "joy", label: "운동", icon: "equipment" },
  { key: "energy", label: "에너지", icon: "energy" }
];

export function StatusBar({ needs }: { needs: NeedValues }) {
  return (
    <header className="status-shell" aria-label="현재 상태">
      <div className="needs-row">{NEEDS.map(({ key, label, icon }) => {
        const value = Math.round(needs[key]);
        return <div key={key} className={`need-indicator need-${key} need-${needState(needs[key]).replace(" ", "-")}`} title={`${label} ${value}`} aria-label={`${label} ${value}, 상태 ${needState(needs[key])}`}><span><GameIcon name={icon} /></span><strong>{label}</strong><small>{value}</small><i aria-hidden="true"><b style={{ width: `${value}%` }} /></i></div>;
      })}</div>
    </header>
  );
}
