import type { PetSpecies } from "./pet.js";

export type SupplementLifeStage = "growth" | "adult" | "senior";
export type SupplementActivity = "low" | "normal" | "high";
export type SupplementGoal = "daily" | "cognition" | "skin" | "joint";
export type SupplementRisk = "medication" | "pancreatitis" | "surgery" | "pregnant" | "kidney-liver";

export interface SupplementAssessmentInput {
  species: PetSpecies;
  weightKg: number;
  lifeStage: SupplementLifeStage;
  activity: SupplementActivity;
  bodyCondition: number;
  goal: SupplementGoal;
  dailyCalories?: number;
  currentEpaDhaMg: number;
  productEpaMg: number;
  productDhaMg: number;
  labelMaxServings: number;
  risks: SupplementRisk[];
}

export type SupplementAssessmentStatus =
  | "planning-reference"
  | "no-addition"
  | "insufficient-evidence"
  | "review-required";

export interface SupplementAssessment {
  status: SupplementAssessmentStatus;
  caloriesPerDay: number;
  caloriesSource: "entered" | "estimated";
  referenceEpaDhaMg: number | null;
  currentEpaDhaMg: number;
  calculatedGapMg: number | null;
  productEpaDhaMg: number;
  calculatedServings: number | null;
  requiresVeterinarian: boolean;
  flags: string[];
}

const REFERENCE_MG_PER_1000_KCAL: Record<PetSpecies, number> = {
  dog: 130,
  cat: 30
};

export function calculateSupplementAssessment(input: SupplementAssessmentInput): SupplementAssessment {
  const caloriesSource = input.dailyCalories ? "entered" : "estimated";
  const caloriesPerDay = round(input.dailyCalories || estimateMaintenanceCalories(input));
  const productEpaDhaMg = round(input.productEpaMg + input.productDhaMg);
  const flags: string[] = [];

  if (caloriesSource === "estimated") flags.push("실제 사료의 일일 kcal를 입력하면 계산 정확도가 높아집니다.");
  if (input.bodyCondition < 4 || input.bodyCondition > 5) flags.push("BCS 4–5 범위를 벗어나 에너지 요구량을 수의사와 다시 확인해야 합니다.");
  if (input.activity === "high") flags.push("고강도 활동 개체는 일반 유지 에너지식이 맞지 않을 수 있습니다.");
  if (input.risks.length > 0) flags.push("약물·기저질환·수술·임신 관련 항목이 있어 급여 전 수의사 확인이 필요합니다.");
  if (input.goal !== "daily") flags.push("질환·증상 목적의 오메가3 용량은 일반 영양 기준으로 정할 수 없습니다.");

  const hasClinicalReviewFlag = input.risks.length > 0 || input.goal !== "daily" || input.bodyCondition < 4 || input.bodyCondition > 5;
  if (input.lifeStage !== "growth") {
    flags.push("FEDIAF는 건강한 성견·성묘의 오메가3에 하나의 특정 권장량을 제시하기에는 근거가 부족하다고 설명합니다.");
    return {
      status: hasClinicalReviewFlag ? "review-required" : "insufficient-evidence",
      caloriesPerDay,
      caloriesSource,
      referenceEpaDhaMg: null,
      currentEpaDhaMg: round(input.currentEpaDhaMg),
      calculatedGapMg: null,
      productEpaDhaMg,
      calculatedServings: null,
      requiresVeterinarian: true,
      flags
    };
  }

  if (caloriesSource === "estimated") {
    flags.push("성장기 기준은 성장 단계별 실제 섭취 열량이 필요하므로 추정 열량만으로 급여량을 정하지 않습니다.");
    return {
      status: "review-required",
      caloriesPerDay,
      caloriesSource,
      referenceEpaDhaMg: null,
      currentEpaDhaMg: round(input.currentEpaDhaMg),
      calculatedGapMg: null,
      productEpaDhaMg,
      calculatedServings: null,
      requiresVeterinarian: true,
      flags
    };
  }

  const referenceEpaDhaMg = round(caloriesPerDay * REFERENCE_MG_PER_1000_KCAL[input.species] / 1_000);
  const calculatedGapMg = round(Math.max(0, referenceEpaDhaMg - input.currentEpaDhaMg));
  const calculatedServings = productEpaDhaMg > 0 ? round(calculatedGapMg / productEpaDhaMg, 2) : null;
  const exceedsLabel = calculatedServings !== null && calculatedServings > input.labelMaxServings;
  if (exceedsLabel) flags.push("계산 참고량이 제품 표시상 일일 최대 급여량을 넘으므로 임의 증량하면 안 됩니다.");
  if (calculatedServings !== null && calculatedServings > 0 && calculatedServings < 1) flags.push("캡슐·정제를 임의로 나누지 말고 소용량 제품 또는 제조사 급여 단위를 확인하세요.");
  flags.push("이 값은 완전사료의 영양 기준과 현재 섭취량을 비교한 참고값이며 치료용 처방량이 아닙니다.");

  return {
    status: hasClinicalReviewFlag || exceedsLabel ? "review-required" : calculatedGapMg === 0 ? "no-addition" : "planning-reference",
    caloriesPerDay,
    caloriesSource,
    referenceEpaDhaMg,
    currentEpaDhaMg: round(input.currentEpaDhaMg),
    calculatedGapMg,
    productEpaDhaMg,
    calculatedServings,
    requiresVeterinarian: hasClinicalReviewFlag || exceedsLabel,
    flags
  };
}

function estimateMaintenanceCalories(input: Pick<SupplementAssessmentInput, "species" | "weightKg" | "activity">): number {
  if (input.species === "cat") {
    const factor = input.activity === "low" ? 52 : input.activity === "high" ? 100 : 75;
    return factor * Math.pow(input.weightKg, 0.67);
  }
  const factor = input.activity === "low" ? 95 : 110;
  return factor * Math.pow(input.weightKg, 0.75);
}

function round(value: number, digits = 0): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
