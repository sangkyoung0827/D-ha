import { useState } from "react";
import { needState } from "../../domain/balance";
import { feedingProgressPercent, feedingSlots, feedingSlotLabel, refreshFeedingPlan } from "../../domain/feeding";
import type { DailyFeedingPlan, FeedingFrequency, NeedValues } from "../../domain/types";
import { GameIcon, type GameIconName } from "../icons/GameIcon";

const NEEDS: Array<{ key: keyof NeedValues; label: string; icon: GameIconName }> = [
  { key: "condition", label: "영양제", icon: "sparkles" },
  { key: "joy", label: "운동", icon: "equipment" }
];

export function StatusBar({ needs, feedingPlan, onFeedingFrequencyChange }: { needs: NeedValues; feedingPlan: DailyFeedingPlan; onFeedingFrequencyChange(frequency: FeedingFrequency): void }) {
  const [feedingSettingsOpen, setFeedingSettingsOpen] = useState(false);
  const currentPlan = refreshFeedingPlan(feedingPlan);
  const foodValue = feedingProgressPercent(currentPlan);
  return (
    <header className="status-shell" aria-label="현재 상태">
      <div className="needs-row">
        <button
          type="button"
          className={`need-indicator need-satiety need-${needState(foodValue).replace(" ", "-")}`}
          title={`밥 ${foodValue}`}
          aria-label={`밥 ${foodValue}, 하루 ${currentPlan.dailyTarget}회 중 ${currentPlan.completedSlots.length}회 완료`}
          aria-expanded={feedingSettingsOpen}
          onClick={() => setFeedingSettingsOpen((open) => !open)}
        ><span><GameIcon name="food" /></span><strong>밥</strong><small>{foodValue}</small><i aria-hidden="true"><b style={{ width: `${foodValue}%` }} /></i></button>
        {NEEDS.map(({ key, label, icon }) => {
        const value = Math.round(needs[key]);
        return <div key={key} className={`need-indicator need-${key} need-${needState(needs[key]).replace(" ", "-")}`} title={`${label} ${value}`} aria-label={`${label} ${value}, 상태 ${needState(needs[key])}`}><span><GameIcon name={icon} /></span><strong>{label}</strong><small>{value}</small><i aria-hidden="true"><b style={{ width: `${value}%` }} /></i></div>;
      })}</div>
      {feedingSettingsOpen && <section className="feeding-settings" role="dialog" aria-label="하루 급양 횟수 설정">
        <header><span><strong>하루 급양 횟수</strong><small>밥 시간대마다 한 번씩 기록돼요.</small></span><button type="button" aria-label="급양 설정 닫기" onClick={() => setFeedingSettingsOpen(false)}>×</button></header>
        <div>{([1, 2, 3, 4] as const).map((frequency) => <button
          key={frequency}
          type="button"
          className={currentPlan.dailyTarget === frequency ? "active" : ""}
          aria-pressed={currentPlan.dailyTarget === frequency}
          onClick={() => { onFeedingFrequencyChange(frequency); setFeedingSettingsOpen(false); }}
        ><strong>하루 {frequency}회</strong><small>{feedingSlots(frequency).map(feedingSlotLabel).join(" · ")}</small></button>)}</div>
        <p>오늘 {currentPlan.completedSlots.length}/{currentPlan.dailyTarget}회 완료</p>
      </section>}
    </header>
  );
}
