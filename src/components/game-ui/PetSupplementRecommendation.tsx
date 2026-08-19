import { useState, type FormEvent } from "react";
import type { PetProfile } from "../../domain/pet";
import { breedDefinition } from "../../domain/pet";
import type { SupplementAssessment, SupplementRisk } from "../../domain/supplementRecommendation";
import { useAccount } from "../../platform/auth/AccountProvider";

interface RecommendationSource {
  id: string;
  citation: number;
  provider: string;
  title: string;
  url: string;
  year?: number;
}

interface RecommendationResponse {
  answer?: string;
  assessment?: SupplementAssessment;
  sources?: RecommendationSource[];
  error?: string;
}

interface RecommendationResult {
  answer: string;
  assessment: SupplementAssessment;
  sources: RecommendationSource[];
}

const RISK_LABELS: Array<{ id: SupplementRisk; label: string }> = [
  { id: "medication", label: "항응고제 등 복용 중" },
  { id: "pancreatitis", label: "췌장염·고지혈증 병력" },
  { id: "surgery", label: "수술 예정" },
  { id: "pregnant", label: "임신·수유 중" },
  { id: "kidney-liver", label: "신장·간 질환" }
];

export function PetSupplementRecommendation({ pet }: { pet: PetProfile }) {
  const { getIdToken } = useAccount();
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    const data = new FormData(event.currentTarget);
    setError("");
    setResult(null);
    setSending(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("로그인 정보를 확인할 수 없습니다.");
      const dailyCalories = String(data.get("dailyCalories") || "").trim();
      const response = await fetch("/api/pet-research", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "supplement-recommendation",
          pet: { name: pet.name, species: pet.species, breed: pet.breed },
          assessment: {
            species: pet.species,
            weightKg: Number(data.get("weightKg")),
            lifeStage: data.get("lifeStage"),
            activity: data.get("activity"),
            bodyCondition: Number(data.get("bodyCondition")),
            goal: data.get("goal"),
            dailyCalories: dailyCalories ? Number(dailyCalories) : undefined,
            currentEpaDhaMg: Number(data.get("currentEpaDhaMg")),
            productEpaMg: Number(data.get("productEpaMg")),
            productDhaMg: Number(data.get("productDhaMg")),
            labelMaxServings: Number(data.get("labelMaxServings")),
            risks: data.getAll("risks")
          }
        })
      });
      const body = await response.json() as RecommendationResponse;
      if (!response.ok || !body.answer || !body.assessment) throw new Error(body.error || "분석 결과를 준비하지 못했습니다.");
      setResult({ answer: body.answer, assessment: body.assessment, sources: body.sources ?? [] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "분석 결과를 준비하지 못했습니다.");
    } finally {
      setSending(false);
    }
  };

  return <div className="pet-feature pet-supplement-feature" data-testid="pet-supplement-overlay">
    <header className="supplement-hero">
      <div><p>AI NUTRITION SCREENING</p><h2 id="sheet-title">반려동물 영양제 추천</h2><span>{pet.name}의 정보와 제품 표시량을 함께 살펴봐요.</span></div>
      <b aria-hidden="true"><i>EPA</i><i>DHA</i><em>AI</em></b>
    </header>

    <div className="supplement-principles" aria-label="AI 영양 코치 원칙">
      <span><b>1</b><strong>규칙 계산</strong><small>AI가 용량을 지어내지 않아요</small></span>
      <span><b>2</b><strong>근거 설명</strong><small>공식 기준을 함께 표시해요</small></span>
      <span><b>3</b><strong>안전 분기</strong><small>위험 조건은 수의사에게 연결해요</small></span>
    </div>

    <section className="supplement-pet-summary">
      <span aria-hidden="true">{pet.species === "dog" ? "🐶" : "🐱"}</span>
      <div><strong>{pet.name}</strong><small>{breedDefinition(pet.breed).label}</small></div>
      <em>EPA + DHA</em>
    </section>

    <form className="pet-feature-form supplement-form" onSubmit={(event) => void submit(event)}>
      <h3>1. 맞춤 정보</h3>
      <label><span>현재 체중 (kg)</span><input name="weightKg" type="number" min="0.2" max="120" step="0.1" required placeholder="예: 4.2" /></label>
      <label><span>연령 단계</span><select name="lifeStage" defaultValue="adult"><option value="growth">성장기</option><option value="adult">성체</option><option value="senior">노령기</option></select></label>
      <label><span>활동량</span><select name="activity" defaultValue="normal"><option value="low">낮음·실내 중심</option><option value="normal">보통</option><option value="high">높음·운동량 많음</option></select></label>
      <label><span>체형 점수 BCS (1–9)</span><select name="bodyCondition" defaultValue="5">{Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}{index + 1 === 5 ? " · 이상적" : ""}</option>)}</select></label>
      <label><span>살펴볼 목적</span><select name="goal" defaultValue="daily"><option value="daily">일상 영양 균형</option><option value="cognition">인지 건강 관심</option><option value="skin">피부·모질 관심</option><option value="joint">관절·이동성 관심</option></select></label>
      <label><span>실제 일일 섭취 kcal <small>선택</small></span><input name="dailyCalories" type="number" min="10" max="10000" step="1" placeholder="사료 포장지 기준" /></label>

      <h3>2. 현재 섭취와 제품 라벨</h3>
      <label className="full"><span>현재 사료·영양제 EPA+DHA 합계 (mg/일)</span><input name="currentEpaDhaMg" type="number" min="0" max="20000" step="1" required defaultValue="0" /></label>
      <label><span>제품 1회분 EPA (mg)</span><input name="productEpaMg" type="number" min="0" max="10000" step="1" required placeholder="성분표 확인" /></label>
      <label><span>제품 1회분 DHA (mg)</span><input name="productDhaMg" type="number" min="0" max="10000" step="1" required placeholder="성분표 확인" /></label>
      <label className="full"><span>제품 표시상 하루 최대 급여량 (회분)</span><input name="labelMaxServings" type="number" min="0.1" max="20" step="0.1" required defaultValue="1" /></label>

      <fieldset className="supplement-risk-list full">
        <legend>급여 전 확인 항목 <small>해당하는 것만 선택</small></legend>
        {RISK_LABELS.map((risk) => <label key={risk.id}><input type="checkbox" name="risks" value={risk.id} /><span>{risk.label}</span></label>)}
      </fieldset>
      <button className="primary-button full" type="submit" disabled={sending}>{sending ? "AI가 근거와 안전 조건을 확인 중..." : "맞춤 영양 분석하기"}</button>
    </form>

    {error && <p className="supplement-error" role="alert">{error}</p>}
    {result && <SupplementResult result={result} />}

    <section className="supplement-compliance">
      <strong>적법한 설명 원칙</strong>
      <p>질병을 치료·예방한다고 표현하지 않고, 성분 등록·제품 표시사항·문헌 근거를 구분합니다. AI 결과는 제품 광고 문구나 수의사의 처방으로 사용하지 않습니다.</p>
    </section>
  </div>;
}

function SupplementResult({ result }: { result: RecommendationResult }) {
  const assessment = result.assessment;
  const status = {
    "planning-reference": ["영양 보완 참고값", "reference"],
    "no-addition": ["추가 보완량 없음", "safe"],
    "insufficient-evidence": ["정량 권고 보류", "review"],
    "review-required": ["수의사 검토 필요", "review"]
  }[assessment.status];
  return <section className="supplement-result" aria-live="polite" data-testid="supplement-result">
    <header><div><p>PERSONALIZED RESULT</p><h3>맞춤 분석 결과</h3></div><span className={status[1]}>{status[0]}</span></header>
    <div className="supplement-metrics">
      <span><small>일일 열량</small><strong>{assessment.caloriesPerDay.toLocaleString()} kcal</strong><em>{assessment.caloriesSource === "entered" ? "직접 입력" : "공식식 추정"}</em></span>
      <span><small>현재 EPA+DHA</small><strong>{assessment.currentEpaDhaMg.toLocaleString()} mg</strong><em>사료·영양제 합계</em></span>
      <span><small>영양 기준 참고</small><strong>{assessment.referenceEpaDhaMg === null ? "산출 보류" : `${assessment.referenceEpaDhaMg.toLocaleString()} mg`}</strong><em>치료 용량 아님</em></span>
      <span><small>계산상 보완분</small><strong>{assessment.calculatedGapMg === null ? "수의사 확인" : `${assessment.calculatedGapMg.toLocaleString()} mg`}</strong><em>{assessment.calculatedServings === null ? "회분 환산 없음" : `제품 약 ${assessment.calculatedServings}회분`}</em></span>
    </div>
    {assessment.flags.length > 0 && <ul>{assessment.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul>}
    <article className="supplement-ai-copy"><b>H · AI 근거 설명</b><p>{result.answer}</p></article>
    <div className="supplement-sources" aria-label="영양 분석 근거">
      {result.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><b>[{source.citation}]</b><span><strong>{source.provider}</strong><small>{source.title}</small></span><em>{source.year ?? "공식"}</em></a>)}
    </div>
  </section>;
}
