import { useState, type CSSProperties } from "react";
import {
  appearanceDescription,
  GLASSES_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  hairColor,
  SKIN_TONES,
  skinColor,
  type AppearanceOption
} from "../../domain/appearance";
import type { CharacterProfile } from "../../domain/types";
import { useGameStore } from "../../store/gameStore";
import { GameIcon } from "../icons/GameIcon";

type PreviewStyle = CSSProperties & { "--skin": string; "--hair": string };

export function Onboarding() {
  const profile = useGameStore((state) => state.profile);
  const createKeeper = useGameStore((state) => state.createKeeper);
  const finishTutorial = useGameStore((state) => state.finishTutorial);
  const [step, setStep] = useState<"intro" | "create" | "tour">("intro");
  const [draft, setDraft] = useState<CharacterProfile>(profile);

  if (step === "intro") {
    return (
      <main className="onboarding ocean-gradient diha-intro" data-testid="onboarding">
        <div className="onboarding-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div className="diha-wordmark" aria-label="D ha 디하"><strong>D ha</strong><span>디하</span></div>
        <div className="pill-mascot" role="img" aria-label="선글라스를 쓰고 손을 흔들며 인사하는 알약 디하">
          <span className="pill-shell"><i className="pill-glasses left" /><i className="pill-glasses right" /><b className="pill-glasses-bridge" /><em className="pill-smile" /></span>
          <span className="pill-arm"><i /><b /></span>
          <span className="pill-shadow" />
        </div>
        <div className="mascot-speech" role="status"><strong>안녕!</strong><span>나는 디하야. 우리 함께 새로운 일상을 시작해볼까?</span></div>
        <button className="primary-button wide" onClick={() => setStep("create")}>디하 시작하기</button>
        <small>의료 서비스가 아닌 가상 게임입니다. 데이터는 이 브라우저에 저장됩니다.</small>
      </main>
    );
  }

  if (step === "create") {
    const previewStyle: PreviewStyle = { "--skin": skinColor(draft.skinTone), "--hair": hairColor(draft.hairColor) };
    return (
      <main className="onboarding create-screen" data-testid="character-creator">
        <p className="eyebrow">DIHA CHARACTER</p>
        <h1>나만의 디하를 만들어볼까요?</h1>
        <div
          className={`css-keeper hair-style-${draft.hairStyle}`}
          style={previewStyle}
          data-testid="character-preview"
          data-skin-tone={draft.skinTone}
          data-hair-style={draft.hairStyle}
          data-hair-color={draft.hairColor}
          data-glasses-style={draft.glassesStyle}
          aria-label={`디하 미리보기: ${appearanceDescription(draft)}`}
        >
          <span className="css-hair-back" />
          <span className="css-face"><i /><i /><b /></span>
          <span className="css-hair" />
          <span className={`css-glasses glasses-${draft.glassesStyle}`}><i /><i /></span>
          <span className="css-arms" />
          <span className="css-shirt" />
          <span className="css-legs" />
          <span className="css-shoes" />
        </div>
        <p className="appearance-summary" aria-live="polite">{appearanceDescription(draft)}<small>기본 복장 · 흰 반팔 + 청바지</small></p>
        <label className="field-label">이름<input value={draft.name} maxLength={20} onChange={(event) => setDraft({ ...draft, name: event.target.value })} aria-label="캐릭터 이름" /></label>
        <Picker label="피부색" options={SKIN_TONES} value={draft.skinTone} onChange={(skinTone) => setDraft({ ...draft, skinTone })} />
        <Picker label="머리 스타일" options={HAIR_STYLES} value={draft.hairStyle} onChange={(hairStyle) => setDraft({ ...draft, hairStyle })} />
        <Picker label="머리 색상" options={HAIR_COLORS} value={draft.hairColor} onChange={(hairColor) => setDraft({ ...draft, hairColor })} />
        <Picker label="안경" options={GLASSES_STYLES} value={draft.glassesStyle} onChange={(glassesStyle) => setDraft({ ...draft, glassesStyle })} />
        <button className="primary-button wide create-submit" disabled={!draft.name.trim()} onClick={() => { createKeeper({ ...draft, name: draft.name.trim() }); setStep("tour"); }}>이 모습으로 시작</button>
      </main>
    );
  }

  return (
    <main className="onboarding tour-screen">
      <div className="tour-map" aria-hidden="true"><span><GameIcon name="home" /></span><i /><span><GameIcon name="ocean" /></span><i /><span><GameIcon name="sparkles" /></span></div>
      <p className="eyebrow">DIHA ORIENTATION</p>
      <h1>돌보고, 놀고,<br />새 해역을 발견하세요.</h1>
      <ul className="tour-list">
        <li><b>01</b><span><strong>네 가지 상태</strong>시간이 지나면 변하지만 최대 24시간까지만 반영돼요.</span></li>
        <li><b>02</b><span><strong>7개의 공간</strong>먹고, 씻고, 쉬고, 스타일을 바꿀 수 있어요.</span></li>
        <li><b>03</b><span><strong>7개의 Ocean Games</strong>코인과 경험치를 얻어 새로운 해역을 열어요.</span></li>
      </ul>
      <button className="primary-button wide" onClick={finishTutorial}>Home 입장 · 보상 받기</button>
    </main>
  );
}

function Picker<T extends string>({ label, options, value, onChange }: { label: string; options: readonly AppearanceOption<T>[]; value: T; onChange(value: T): void }) {
  return (
    <fieldset className="picker">
      <legend>{label}</legend>
      <div>{options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === value ? "selected" : ""}
          aria-label={`${label} ${option.label}`}
          aria-pressed={option.id === value}
          data-testid={`appearance-${option.id}`}
          onClick={() => onChange(option.id)}
        >
          {option.color ? <><span className="swatch" style={{ background: option.color }} aria-hidden="true" /><small>{option.label}</small></> : option.label}
        </button>
      ))}</div>
    </fieldset>
  );
}
