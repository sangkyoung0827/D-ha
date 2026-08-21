import { useState, type FormEvent } from "react";
import { needState } from "../../domain/balance";
import { dailyExerciseProgressPercent, formatExerciseMeters, refreshDailyExercise } from "../../domain/exercise";
import { feedingProgressPercent, feedingSlots, feedingSlotLabel, refreshFeedingPlan } from "../../domain/feeding";
import type { DailyExercisePlan, DailyFeedingPlan, FeedingFrequency, NeedValues } from "../../domain/types";
import { GameIcon } from "../icons/GameIcon";

const EXERCISE_GOALS = [500, 1_000, 2_000, 3_000] as const;

export function StatusBar({
  needs,
  feedingPlan,
  exercisePlan,
  onFeedingFrequencyChange,
  onExerciseGoalChange
}: {
  needs: NeedValues;
  feedingPlan: DailyFeedingPlan;
  exercisePlan: DailyExercisePlan;
  onFeedingFrequencyChange(frequency: FeedingFrequency): void;
  onExerciseGoalChange(goalMeters: number): void;
}) {
  const [openPanel, setOpenPanel] = useState<"feeding" | "exercise" | null>(null);
  const [exerciseGoalDraft, setExerciseGoalDraft] = useState(exercisePlan.goalMeters);
  const currentFeeding = refreshFeedingPlan(feedingPlan);
  const currentExercise = refreshDailyExercise(exercisePlan);
  const foodValue = feedingProgressPercent(currentFeeding);
  const exerciseValue = dailyExerciseProgressPercent(currentExercise);
  const conditionValue = Math.round(needs.condition);

  const saveExerciseGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onExerciseGoalChange(exerciseGoalDraft);
    setOpenPanel(null);
  };

  return (
    <header className="status-shell" aria-label="현재 상태">
      <div className="needs-row">
        <button
          type="button"
          className={`need-indicator need-satiety need-${needState(foodValue).replace(" ", "-")}`}
          title={`밥 ${foodValue}`}
          aria-label={`밥 ${foodValue}, 하루 ${currentFeeding.dailyTarget}회 중 ${currentFeeding.completedSlots.length}회 완료`}
          aria-expanded={openPanel === "feeding"}
          onClick={() => setOpenPanel((panel) => panel === "feeding" ? null : "feeding")}
        ><span><GameIcon name="food" /></span><strong>밥</strong><small>{foodValue}</small><i aria-hidden="true"><b style={{ width: `${foodValue}%` }} /></i></button>
        <div className={`need-indicator need-condition need-${needState(needs.condition).replace(" ", "-")}`} title={`영양제 ${conditionValue}`} aria-label={`영양제 ${conditionValue}, 상태 ${needState(needs.condition)}`}><span><GameIcon name="sparkles" /></span><strong>영양제</strong><small>{conditionValue}</small><i aria-hidden="true"><b style={{ width: `${conditionValue}%` }} /></i></div>
        <button
          type="button"
          className={`need-indicator need-joy need-${exerciseValue >= 100 ? "활기참" : exerciseValue >= 40 ? "보통" : "돌봄-필요"}`}
          title={`운동 ${formatExerciseMeters(currentExercise.distanceMeters)} 이동`}
          aria-label={`운동 ${formatExerciseMeters(currentExercise.distanceMeters)} 이동, 오늘 목표 ${formatExerciseMeters(currentExercise.goalMeters)}`}
          aria-expanded={openPanel === "exercise"}
          onClick={() => {
            setExerciseGoalDraft(currentExercise.goalMeters);
            setOpenPanel((panel) => panel === "exercise" ? null : "exercise");
          }}
        ><span><GameIcon name="equipment" /></span><strong>운동</strong><small className="exercise-distance">{formatExerciseMeters(currentExercise.distanceMeters)} 이동</small><i aria-hidden="true"><b style={{ width: `${exerciseValue}%` }} /></i></button>
      </div>
      {openPanel === "feeding" && <section className="status-settings feeding-settings" role="dialog" aria-label="하루 급양 횟수 설정">
        <header><span><strong>하루 급양 횟수</strong><small>밥 시간대마다 한 번씩 기록돼요.</small></span><button type="button" aria-label="급양 설정 닫기" onClick={() => setOpenPanel(null)}>×</button></header>
        <div className="status-setting-options">{([1, 2, 3, 4] as const).map((frequency) => <button
          key={frequency}
          type="button"
          className={currentFeeding.dailyTarget === frequency ? "active" : ""}
          aria-pressed={currentFeeding.dailyTarget === frequency}
          onClick={() => { onFeedingFrequencyChange(frequency); setOpenPanel(null); }}
        ><strong>하루 {frequency}회</strong><small>{feedingSlots(frequency).map(feedingSlotLabel).join(" · ")}</small></button>)}</div>
        <p>오늘 {currentFeeding.completedSlots.length}/{currentFeeding.dailyTarget}회 완료</p>
      </section>}
      {openPanel === "exercise" && <section className="status-settings exercise-settings" role="dialog" aria-label="오늘의 운동 목표 설정">
        <header><span><strong>오늘의 운동 목표</strong><small>펫의 탐험 GPS 거리로 자동 측정해요.</small></span><button type="button" aria-label="운동 설정 닫기" onClick={() => setOpenPanel(null)}>×</button></header>
        <div className="exercise-today"><strong>{formatExerciseMeters(currentExercise.distanceMeters)} 이동</strong><span>목표 {formatExerciseMeters(currentExercise.goalMeters)} · {exerciseValue}%</span></div>
        <div className="exercise-goal-presets">{EXERCISE_GOALS.map((goal) => <button key={goal} type="button" className={exerciseGoalDraft === goal ? "active" : ""} aria-pressed={exerciseGoalDraft === goal} onClick={() => setExerciseGoalDraft(goal)}>{formatExerciseMeters(goal)}</button>)}</div>
        <form onSubmit={saveExerciseGoal}>
          <label><span>목표 거리</span><input aria-label="오늘의 운동 목표량" type="number" min="100" max="50000" step="100" value={exerciseGoalDraft} onChange={(event) => setExerciseGoalDraft(Number(event.target.value))} /><b>M</b></label>
          <button type="submit">목표 저장</button>
        </form>
        <p>‘펫의 탐험’에서 실시간 탐험을 종료하면 오늘 이동 거리에 누적됩니다.</p>
      </section>}
    </header>
  );
}
