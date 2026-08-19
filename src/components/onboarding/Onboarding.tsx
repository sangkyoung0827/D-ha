import { useState, type CSSProperties } from "react";
import {
  FUR_COLORS,
  PET_ACCESSORIES,
  PET_COLLARS,
  PET_HATS,
  PET_OUTFITS,
  PET_PATTERNS,
  breedsForSpecies,
  petDescription,
  type PetOption,
  type PetProfile,
  type PetSpecies
} from "../../domain/pet";
import { useGameStore } from "../../store/gameStore";
import { useAccount } from "../../platform/auth/AccountProvider";
import { GoogleSignInScreen } from "../auth/GoogleSignInScreen";
import { GameIcon } from "../icons/GameIcon";
import { PetAvatar } from "../pet/PetAvatar";

export function Onboarding() {
  const profile = useGameStore((state) => state.profile);
  const createPet = useGameStore((state) => state.createPet);
  const finishTutorial = useGameStore((state) => state.finishTutorial);
  const hydratedOwner = useGameStore((state) => state.hydratedOwner);
  const syncStatus = useGameStore((state) => state.syncStatus);
  const { status: accountStatus, account } = useAccount();
  const [step, setStep] = useState<"intro" | "create" | "account" | "tour">("intro");
  const [draft, setDraft] = useState<PetProfile>(profile);

  const visibleStep = step === "account" && accountStatus === "signed-in" && account && hydratedOwner === `user:${account.uid}` && syncStatus !== "syncing"
    ? "tour"
    : step;

  if (visibleStep === "intro") {
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
        <small>의료 서비스가 아닌 가상 게임입니다. 생성 후 Google 계정에 안전하게 저장합니다.</small>
      </main>
    );
  }

  if (visibleStep === "create") {
    const selectSpecies = (species: PetSpecies) => {
      const breed = breedsForSpecies(species)[0]!;
      setDraft({ ...draft, species, breed: breed.id, furColor: breed.defaultFur, pattern: breed.defaultPattern });
    };
    return (
      <main className="onboarding create-screen pet-create-screen" data-testid="pet-creator">
        <p className="eyebrow">DIHA PET</p>
        <h1>함께할 반려동물을 골라요</h1>
        <section className="pet-preview-stage" aria-label="실시간 반려동물 커스터마이징 미리보기">
          <span className="pet-preview-quality"><i /> REAL FUR PREVIEW</span>
          <PetAvatar appearance={draft} testId="pet-preview" />
          <div className="pet-preview-floor" aria-hidden="true" />
        </section>
        <p className="appearance-summary" aria-live="polite">{petDescription(draft)}<small>{draft.species === "dog" ? "강아지" : "고양이"} · 품종의 얼굴·털·체형을 그대로 유지해요</small></p>
        <label className="field-label">이름<input value={draft.name} maxLength={20} onChange={(event) => setDraft({ ...draft, name: event.target.value })} aria-label="반려동물 이름" /></label>
        <fieldset className="picker species-picker"><legend>종</legend><div>
          <button type="button" className={draft.species === "dog" ? "selected" : ""} aria-pressed={draft.species === "dog"} onClick={() => selectSpecies("dog")}>🐶 강아지</button>
          <button type="button" className={draft.species === "cat" ? "selected" : ""} aria-pressed={draft.species === "cat"} onClick={() => selectSpecies("cat")}>🐱 고양이</button>
        </div></fieldset>
        <fieldset className="picker breed-picker"><legend>품종</legend><div>{breedsForSpecies(draft.species).map((breed) => <button
          key={breed.id}
          type="button"
          className={breed.id === draft.breed ? "selected" : ""}
          aria-label={`품종 ${breed.label}`}
          aria-pressed={breed.id === draft.breed}
          data-testid={`pet-breed-${breed.id}`}
          onClick={() => setDraft({ ...draft, breed: breed.id, species: breed.species, furColor: breed.defaultFur, pattern: breed.defaultPattern })}
        ><i className={`breed-sample coat-${breed.coat}`} style={{ "--sample-fur": FUR_COLORS.find((color) => color.id === breed.defaultFur)?.color } as CSSProperties}><span /><b /></i><small>{breed.label}</small></button>)}</div></fieldset>
        <Picker label="털 색상" options={FUR_COLORS} value={draft.furColor} onChange={(furColor) => setDraft({ ...draft, furColor })} />
        <Picker label="기본 무늬" options={PET_PATTERNS} value={draft.pattern} onChange={(pattern) => setDraft({ ...draft, pattern })} />
        <Picker label="목걸이" options={PET_COLLARS} value={draft.collar} onChange={(collar) => setDraft({ ...draft, collar })} />
        <Picker label="모자" options={PET_HATS} value={draft.hat} onChange={(hat) => setDraft({ ...draft, hat })} />
        <Picker label="안경/액세서리" options={PET_ACCESSORIES} value={draft.accessory} onChange={(accessory) => setDraft({ ...draft, accessory })} />
        <Picker label="의상" options={PET_OUTFITS} value={draft.outfit} onChange={(outfit) => setDraft({ ...draft, outfit })} />
        <button className="primary-button wide create-submit" disabled={!draft.name.trim()} onClick={() => { createPet({ ...draft, name: draft.name.trim() }); setStep(accountStatus === "signed-in" ? "tour" : "account"); }}>이 모습으로 시작</button>
      </main>
    );
  }

  if (visibleStep === "account") return <GoogleSignInScreen profile={profile} />;

  return (
    <main className="onboarding tour-screen">
      <div className="tour-map" aria-hidden="true"><span><GameIcon name="home" /></span><i /><span><GameIcon name="heart" /></span><i /><span><GameIcon name="sparkles" /></span></div>
      <p className="eyebrow">DIHA PET LIFE</p>
      <h1>함께 살고, 돌보고,<br />매일 새로운 곳을 만나요.</h1>
      <ul className="tour-list">
        <li><b>01</b><span><strong>우리 집</strong>자기 집에서 쉬고 조이스틱으로 집 안을 자유롭게 걸어요.</span></li>
        <li><b>02</b><span><strong>반려동물 장소</strong>동물병원, 애견 카페, 산책로, 미용실과 펫샵을 만나보세요.</span></li>
        <li><b>03</b><span><strong>나만의 모습</strong>품종 고유 체형을 유지하면서 털, 무늬와 액세서리를 바꿔요.</span></li>
      </ul>
      <button className="primary-button wide" onClick={finishTutorial}>Home 입장 · 보상 받기</button>
    </main>
  );
}

function Picker<T extends string>({ label, options, value, onChange }: { label: string; options: readonly PetOption<T>[]; value: T; onChange(value: T): void }) {
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
          data-testid={`pet-option-${option.id}`}
          onClick={() => onChange(option.id)}
        >
          {option.color ? <><span className="swatch" style={{ background: option.color }} aria-hidden="true" /><small>{option.label}</small></> : option.label}
        </button>
      ))}</div>
    </fieldset>
  );
}
