/**
 * kdri_data.ts — 보건복지부 한국인 영양소 섭취기준(KDRIs) 상한 섭취량(UL)
 * 출처: 2020 한국인 영양소 섭취기준 (보건복지부)
 * 대상 월령: 0~36개월 영유아
 *
 * 키 형식: "성분명||단위"
 */

export type AgeGroup = "0-5" | "6-11" | "12-35"

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
}

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  "0-5": "0~5개월 기준",
  "6-11": "6~11개월 기준",
  "12-35": "12~35개월 기준",
}

export function getAgeGroup(monthsOld: number): AgeGroup {
  if (monthsOld <= 5) return "0-5"
  if (monthsOld <= 11) return "6-11"
  return "12-35"
}

export function getUpperLimits(monthsOld: number): Record<string, number> {
  return KDRI_UL[getAgeGroup(monthsOld)]
}
