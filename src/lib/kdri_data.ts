/**
 * kdri_data.ts — 보건복지부 한국인 영양소 섭취기준(KDRIs) 상한 섭취량(UL)
 * 출처: 2020 한국인 영양소 섭취기준 (보건복지부)
 * 대상 월령: 0~88개월 (초등학교 입학 전)
 *
 * 키 형식: "성분명||단위"
 *
 * ⚠ 데이터 정밀도 참고
 * - "0-5" / "6-11" / "12-35" : 2020 KDRIs 원자료 기반
 * - "36-71" (3~5세) / "72-88" (6~7세) : 2020 KDRIs 해당 연령 구간 값 사용
 *   성별 구분이 없는 경우 평균값을 적용했으며, 정밀 임상 목적으로는 별도 확인 필요
 */

// ─── 서비스 연령 범위 ─────────────────────────────────────────────────────────
export const MIN_MONTHS = 0
export const MAX_MONTHS = 88

export type AgeGroup = "0-5" | "6-11" | "12-35" | "36-71" | "72-88"

export const KDRI_UL: Record<AgeGroup, Record<string, number>> = {
  // 0~5개월 상한 섭취량
  "0-5": {
    "철||mg": 40,
    "아연||mg": 4,
    "비타민A||μg RE": 600,
    "비타민D||μg": 25,
  },
  // 6~11개월 상한 섭취량
  "6-11": {
    "철||mg": 40,
    "아연||mg": 5,
    "비타민A||μg RE": 600,
    "비타민D||μg": 25,
  },
  // 1~2세(12~35개월) 상한 섭취량
  "12-35": {
    "칼슘||mg": 2500,
    "철||mg": 40,
    "아연||mg": 6,
    "비타민A||μg RE": 600,
    "비타민D||μg": 30,
    "비타민C||mg": 400,
  },
  // 3~5세(36~71개월) 상한 섭취량
  "36-71": {
    "칼슘||mg": 2500,
    "철||mg": 40,
    "아연||mg": 9,
    "비타민A||μg RE": 650,
    "비타민D||μg": 35,
    "비타민C||mg": 500,
  },
  // 6~7세(72~88개월) 상한 섭취량
  "72-88": {
    "칼슘||mg": 2500,
    "철||mg": 40,
    "아연||mg": 13,
    "비타민A||μg RE": 750,
    "비타민D||μg": 40,
    "비타민C||mg": 700,
  },
}

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  "0-5":   "0~5개월 기준",
  "6-11":  "6~11개월 기준",
  "12-35": "12~35개월 기준",
  "36-71": "3~5세 기준",
  "72-88": "6~7세 기준",
}

export function getAgeGroup(monthsOld: number): AgeGroup {
  if (monthsOld <= 5)  return "0-5"
  if (monthsOld <= 11) return "6-11"
  if (monthsOld <= 35) return "12-35"
  if (monthsOld <= 71) return "36-71"
  return "72-88"
}

/**
 * 다음 연령 구간 진입 월령 — NutrientTrendChart 미래 Gap 안내에 사용
 * null이면 마지막 구간 (더 이상 높아지지 않음)
 */
export const NEXT_AGE_THRESHOLD: Record<AgeGroup, number | null> = {
  "0-5":   6,
  "6-11":  12,
  "12-35": 36,
  "36-71": 72,
  "72-88": null,
}

export function getUpperLimits(monthsOld: number): Record<string, number> {
  return KDRI_UL[getAgeGroup(monthsOld)]
}

// ─── 권장/충분 섭취량(RI) + 식품 보완 가이드 ──────────────────────────────────
// 출처: 2020 한국인 영양소 섭취기준 (보건복지부)
// 키 형식: "성분명||단위" (UL 키와 동일)

export type RIEntry = {
  ri: number       // 권장 또는 충분 섭취량
  foodSource: string // 대체 식품 가이드 텍스트
}

export const KDRI_RI: Record<AgeGroup, Record<string, RIEntry>> = {
  "0-5": {
    "철||mg":       { ri: 0.27, foodSource: "모유 또는 분유를 통해 대부분 충당됩니다" },
    "비타민D||μg":  { ri: 5,    foodSource: "햇빛 노출(하루 15분) 또는 모유 수유로 충당됩니다" },
  },
  "6-11": {
    "칼슘||mg":        { ri: 260, foodSource: "모유·분유 500ml 또는 플레인 요구르트 1개" },
    "철||mg":          { ri: 11,  foodSource: "소고기 이유식 20g 또는 닭간 이유식 10g" },
    "아연||mg":        { ri: 3,   foodSource: "소고기 이유식 30g 또는 두부 퓨레 50g" },
    "비타민D||μg":     { ri: 5,   foodSource: "연어 이유식 20g 또는 계란 노른자 1개" },
    "비타민A||μg RE":  { ri: 400, foodSource: "당근 퓨레 10g 또는 고구마 이유식 30g" },
    "비타민C||mg":     { ri: 40,  foodSource: "사과 이유식 50g 또는 배 이유식 40g" },
  },
  "12-35": {
    "칼슘||mg":        { ri: 500, foodSource: "우유 1컵(200ml) 또는 치즈 2장" },
    "철||mg":          { ri: 6,   foodSource: "소고기 40g 또는 닭고기 50g" },
    "아연||mg":        { ri: 3,   foodSource: "소고기 30g 또는 두부 100g" },
    "비타민D||μg":     { ri: 5,   foodSource: "연어 30g 또는 계란 노른자 1개" },
    "비타민C||mg":     { ri: 40,  foodSource: "딸기 6개(60g) 또는 브로콜리 30g" },
    "비타민A||μg RE":  { ri: 300, foodSource: "당근 15g 또는 달걀 1개" },
  },
  // 3~5세(36~71개월) 권장/충분 섭취량
  "36-71": {
    "칼슘||mg":        { ri: 600, foodSource: "우유 1.5컵(300ml) 또는 치즈 3장" },
    "철||mg":          { ri: 7,   foodSource: "소고기 50g 또는 닭고기 70g" },
    "아연||mg":        { ri: 4,   foodSource: "소고기 40g 또는 두부 120g" },
    "비타민D||μg":     { ri: 5,   foodSource: "연어 30g 또는 계란 노른자 1개" },
    "비타민C||mg":     { ri: 45,  foodSource: "딸기 6개(60g) 또는 귤 1개" },
    "비타민A||μg RE":  { ri: 250, foodSource: "당근 15g 또는 고구마 30g" },
  },
  // 6~7세(72~88개월) 권장/충분 섭취량
  "72-88": {
    "칼슘||mg":        { ri: 700, foodSource: "우유 1.5컵(300ml) 또는 치즈 3장" },
    "철||mg":          { ri: 9,   foodSource: "소고기 60g 또는 닭고기 80g" },
    "아연||mg":        { ri: 5,   foodSource: "소고기 50g 또는 두부 150g" },
    "비타민D||μg":     { ri: 5,   foodSource: "연어 30g 또는 계란 노른자 2개" },
    "비타민C||mg":     { ri: 50,  foodSource: "딸기 8개(80g) 또는 귤 1개" },
    "비타민A||μg RE":  { ri: 300, foodSource: "당근 20g 또는 달걀 1개" },
  },
}

export function getRecommendedIntakes(monthsOld: number): Record<string, RIEntry> {
  return KDRI_RI[getAgeGroup(monthsOld)]
}
