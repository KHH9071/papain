/**
 * nutrition_utils.ts — HomeClient·SearchClient 공용 영양 상태 유틸
 *
 * 주의: 이 파일의 텍스트/문구는 의료 판단이 아닌 정보 탐색 관점을 유지합니다.
 * "권장", "필수", "결핍" 대신 "살펴보기", "목표", "챙기는 경우" 표현을 사용합니다.
 */

import type { Product } from "@/lib/types"
import {
  type AgeGroup,
  getUpperLimits,
  getRecommendedIntakes,
} from "@/lib/kdri_data"

// ─── 시기별 설정 ───────────────────────────────────────────────────────────────
// HomeClient 브리핑 카드 + SearchClient 컨텍스트 배너에서 공동 사용
export const PERIOD_CONFIG: Record<AgeGroup, {
  period: string    // 시기 이름 (예: "이유식 시작 시기")
  message: string   // 브리핑 문구
  focus: string[]   // 이 시기에 주로 살펴보는 영양소 이름 목록
}> = {
  "0-5": {
    period: "모유·분유 시기",
    message: "이 시기엔 비타민D를 따로 살펴보는 경우가 많아요",
    focus: ["비타민D"],
  },
  "6-11": {
    period: "이유식 시작 시기",
    message: "철분·아연·비타민D를 주로 살펴봐요",
    focus: ["철", "아연", "비타민D"],
  },
  "12-35": {
    period: "유아 초기 시기",
    message: "칼슘·철분·아연을 함께 살펴보는 경우가 많아요",
    focus: ["칼슘", "철", "아연", "비타민D"],
  },
  "36-71": {
    period: "유아 중기 시기",
    message: "칼슘·철·아연을 균형 있게 살펴보는 시기예요",
    focus: ["칼슘", "철", "아연", "비타민D"],
  },
  "72-88": {
    period: "학령전기",
    message: "칼슘·비타민D를 꾸준히 살펴보는 것이 도움이 돼요",
    focus: ["칼슘", "철", "비타민D"],
  },
}

// ─── 공용 유틸 ────────────────────────────────────────────────────────────────
export function getMultiplier(product: Product): number {
  if (product.base_unit === "ml" && product.daily_serving_count) {
    return product.daily_serving_count / 100
  }
  if (product.base_unit === "장" && product.daily_serving_count) {
    return product.daily_serving_count
  }
  return 1
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 현재 선택된 제품 조합에서 RI 미달·UL 초과 영양소 이름 목록을 반환합니다.
 * 제품이 없으면 빈 배열을 반환합니다 (판단하지 않음).
 */
export function getNutrientGaps(
  selectedProducts: Product[],
  monthsOld: number
): { underNames: string[]; exceededNames: string[] } {
  if (selectedProducts.length === 0) return { underNames: [], exceededNames: [] }

  const upperLimits = getUpperLimits(monthsOld)
  const riData = getRecommendedIntakes(monthsOld)

  // 영양소 합산 — 비타민D IU → μg 변환 포함
  const totals = new Map<string, number>()
  for (const product of selectedProducts) {
    const mult = getMultiplier(product)
    for (const nutrient of product.nutrients) {
      if (nutrient.name === "비타민D" && nutrient.unit === "IU") {
        const key = "비타민D||μg"
        totals.set(key, (totals.get(key) ?? 0) + (nutrient.amount * mult) / 40)
      } else {
        const key = `${nutrient.name}||${nutrient.unit}`
        totals.set(key, (totals.get(key) ?? 0) + nutrient.amount * mult)
      }
    }
  }

  const underNames: string[] = []
  const exceededNames: string[] = []

  const allKeys = new Set([...Object.keys(upperLimits), ...Object.keys(riData)])
  for (const key of allKeys) {
    const name = key.split("||")[0]
    const amount = totals.get(key) ?? 0
    const ul = upperLimits[key]
    const ri = riData[key]?.ri

    if (ul !== undefined && amount > ul) {
      exceededNames.push(name)
    } else if (ri !== undefined && ri > 0 && amount < ri) {
      underNames.push(name)
    }
  }

  return {
    underNames: [...new Set(underNames)],
    exceededNames: [...new Set(exceededNames)],
  }
}
