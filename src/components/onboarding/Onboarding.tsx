import { useState } from "react";
import type { CharacterProfile } from "../../domain/types";
import { useGameStore } from "../../store/gameStore";
import { GameIcon } from "../icons/GameIcon";

const SKINS: CharacterProfile["skinTone"][] = ["sunrise", "sand", "cocoa", "deep"];
const HAIRS: CharacterProfile["hairStyle"][] = ["wave", "crop", "bun", "curl"];
const HAIR_COLORS: CharacterProfile["hairColor"][] = ["midnight", "coral", "chestnut", "silver"];

export function Onboarding() {
  const profile = useGameStore((state) => state.profile);
  const createKeeper = useGameStore((state) => state.createKeeper);
  const finishTutorial = useGameStore((state) => state.finishTutorial);
  const [step, setStep] = useState<"intro" | "create" | "tour">("intro");
  const [draft, setDraft] = useState<CharacterProfile>(profile);

  if (step === "intro") {
    return (
      <main className="onboarding ocean-gradient" data-testid="onboarding">
        <div className="onboarding-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div className="keeper-emblem" aria-hidden="true"><i className="emblem-head" /><i className="emblem-body" /><b>≈</b></div>
        <p className="eyebrow">알고케어</p>
        <h1>바다 곁의 작은 일상을<br />함께 돌봐요.</h1>
        <p className="intro-copy">Ocean Keeper의 컨디션과 공간을 천천히 가꾸는 로컬 우선 돌봄 게임입니다.</p>
        <button className="primary-button wide" onClick={() => setStep("create")}>나의 Keeper 만들기</button>
        <small>의료 서비스가 아닌 가상 게임입니다. 데이터는 이 브라우저에 저장됩니다.</small>
      </main>
    );
  }

  if (step === "create") {
    return (
      <main className="onboarding create-screen">
        <p className="eyebrow">KEEPER PROFILE</p>
        <h1>어떤 모습으로 시작할까요?</h1>
        <div className={`css-keeper skin-${draft.skinTone} hair-${draft.hairColor}`} aria-label="Keeper 미리보기">
          <span className={`css-hair ${draft.hairStyle}`} /><span className="css-face"><i /><i /><b /></span><span className="css-shirt" /><span className="css-legs" />
        </div>
        <label className="field-label">이름<input value={draft.name} maxLength={20} onChange={(event) => setDraft({ ...draft, name: event.target.value })} aria-label="캐릭터 이름" /></label>
        <Picker label="피부 톤" values={SKINS} value={draft.skinTone} onChange={(skinTone) => setDraft({ ...draft, skinTone })} />
        <Picker label="머리 모양" values={HAIRS} value={draft.hairStyle} onChange={(hairStyle) => setDraft({ ...draft, hairStyle })} />
        <Picker label="머리 색상" values={HAIR_COLORS} value={draft.hairColor} onChange={(hairColor) => setDraft({ ...draft, hairColor })} />
        <button className="primary-button wide" disabled={!draft.name.trim()} onClick={() => { createKeeper({ ...draft, name: draft.name.trim() }); setStep("tour"); }}>이 모습으로 시작</button>
      </main>
    );
  }

  return (
    <main className="onboarding tour-screen">
      <div className="tour-map" aria-hidden="true"><span><GameIcon name="home" /></span><i /><span><GameIcon name="ocean" /></span><i /><span><GameIcon name="sparkles" /></span></div>
      <p className="eyebrow">KEEPER ORIENTATION</p>
      <h1>돌보고, 놀고,<br />새 해역을 발견하세요.</h1>
      <ul className="tour-list">
        <li><b>01</b><span><strong>다섯 가지 상태</strong>시간이 지나면 변하지만 최대 24시간까지만 반영돼요.</span></li>
        <li><b>02</b><span><strong>7개의 공간</strong>먹고, 씻고, 쉬고, 스타일을 바꿀 수 있어요.</span></li>
        <li><b>03</b><span><strong>세 가지 미니게임</strong>코인과 경험치를 얻어 새로운 기능을 열어요.</span></li>
      </ul>
      <button className="primary-button wide" onClick={finishTutorial}>Home 입장 · 보상 받기</button>
    </main>
  );
}

function Picker<T extends string>({ label, values, value, onChange }: { label: string; values: readonly T[]; value: T; onChange(value: T): void }) {
  return (
    <fieldset className="picker"><legend>{label}</legend><div>{values.map((entry) => <button key={entry} type="button" className={entry === value ? "selected" : ""} aria-label={entry} aria-pressed={entry === value} onClick={() => onChange(entry)}>{label === "피부 톤" ? <span className={`swatch ${entry}`} aria-hidden="true" /> : entry}</button>)}</div></fieldset>
  );
}
