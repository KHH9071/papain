/**
 * routine_foods.ts — 루틴 식품 Mock DB
 * (분유 / 우유 / 치즈 등 매일 먹이는 기본 식품)
 * 영양소 키: "영양소명||단위" — KDRI_RI 키와 동일 포맷
 * nutrients 값 단위: ml 기반 식품 → per 100ml, 슬라이스 기반 → per slice
 */

export type RoutineFood = {
  id: string
  name: string
  brand: string
  category: "formula" | "milk" | "cheese"
  baseUnit: "ml" | "slice"
  defaultAmount: number  // 기본 하루 섭취량 (ml 또는 슬라이스 수)
  nutrients: Record<string, number>
  /** formula 전용: 분유 서브타입 (고신뢰 항목만) */
  formulaSubtype?: FormulaSubtype
  /** formula 전용: 원유 동물 기반 (고신뢰 항목만) */
  baseAnimalType?: "cow" | "goat"
}

export type SelectedRoutineFood = {
  food: RoutineFood
  amountPerDay: number
}

export const ROUTINE_FOODS: RoutineFood[] = [
  {
    id: "aptamil-1",
    name: "압타밀 1단계",
    brand: "Aptamil",
    category: "formula",
    baseUnit: "ml",
    defaultAmount: 800,
    // formulaSubtype: 제품명에 특수분유 지시자 없음 → 설정 안 함 ("standard" 추정 금지)
    // baseAnimalType: 제품명에 명시 없음 → 설정 안 함 (도메인 지식으로 "cow" 단언 금지)
    nutrients: {
      "칼슘||mg":       56,
      "비타민D||μg":    1.25,
      "철||mg":         1.2,
      "아연||mg":       0.5,
      "비타민C||mg":    8,
      "비타민A||μg RE": 60,
    },
  },
  {
    id: "imperial-xo-3",
    name: "임페리얼 XO 3단계",
    brand: "남양유업",
    category: "formula",
    baseUnit: "ml",
    defaultAmount: 600,
    // formulaSubtype: 제품명에 특수분유 지시자 없음 → 설정 안 함
    // baseAnimalType: 제품명에 명시 없음 → 설정 안 함
    nutrients: {
      "칼슘||mg":       100,
      "비타민D||μg":    1.6,
      "철||mg":         1.5,
      "아연||mg":       0.8,
      "비타민C||mg":    6,
      "비타민A||μg RE": 55,
    },
  },
  {
    id: "absolute-2",
    name: "앱솔루트 명작 2단계",
    brand: "매일유업",
    category: "formula",
    baseUnit: "ml",
    defaultAmount: 700,
    // formulaSubtype: 제품명에 특수분유 지시자 없음 → 설정 안 함
    // baseAnimalType: 제품명에 명시 없음 → 설정 안 함
    nutrients: {
      "칼슘||mg":       75,
      "비타민D||μg":    1.1,
      "철||mg":         1.0,
      "아연||mg":       0.5,
      "비타민C||mg":    5,
      "비타민A||μg RE": 50,
    },
  },
  {
    id: "seoul-milk",
    name: "서울우유",
    brand: "서울우유협동조합",
    category: "milk",
    baseUnit: "ml",
    defaultAmount: 400,
    nutrients: {
      "칼슘||mg":    110,
      "비타민D||μg": 0.5,
    },
  },
  {
    id: "sanghwa-milk",
    name: "상하 유기농 우유",
    brand: "매일유업",
    category: "milk",
    baseUnit: "ml",
    defaultAmount: 400,
    nutrients: {
      "칼슘||mg":    115,
      "비타민D||μg": 0.4,
    },
  },
  {
    id: "baby-cheese",
    name: "아기치즈",
    brand: "서울유업",
    category: "cheese",
    baseUnit: "slice",
    defaultAmount: 2,
    nutrients: {
      "칼슘||mg":    105,  // per slice
      "비타민D||μg": 0.3,  // per slice
    },
  },
]

/** 루틴 식품 영양소 합산 → { "영양소||단위": 총량 } */
export function computeRoutineContribution(
  selected: SelectedRoutineFood[]
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const { food, amountPerDay } of selected) {
    const multiplier = food.baseUnit === "ml" ? amountPerDay / 100 : amountPerDay
    for (const [key, valuePer100] of Object.entries(food.nutrients)) {
      result[key] = parseFloat(((result[key] ?? 0) + valuePer100 * multiplier).toFixed(4))
    }
  }
  return result
}

export const CATEGORY_ICON: Record<RoutineFood["category"], string> = {
  formula: "🍼",
  milk:    "🥛",
  cheese:  "🧀",
}

export const CATEGORY_LABEL: Record<RoutineFood["category"], string> = {
  formula: "분유",
  milk:    "우유",
  cheese:  "치즈",
}

// ─── 통합 Product 형식 변환 (향후 Supabase 단일 테이블 마이그레이션 준비) ─────
import type { Product, FormulaSubtype } from "./types"
import {
  deriveFormulaMetadata,
  deriveMilkMetadata,
  deriveCheeseMetadata,
} from "./metadata_seed"

/**
 * ROUTINE_PRODUCTS — ROUTINE_FOODS를 통합 Product 타입으로 변환한 목록
 * - id: 음수(-1~-N)로 DB products와 충돌 방지
 * - base_unit: "ml" → nutrients는 per 100ml 기준, "장" → per slice 기준
 * - daily_serving_count: 하루 섭취량(ml 또는 장) — 사용자가 수정 가능
 * - metadata: 고신뢰 항목만 보수적으로 seed (metadata_seed.ts 참조)
 */
export const ROUTINE_PRODUCTS: Product[] = ROUTINE_FOODS.map((food, i) => {
  const metadata =
    food.category === "formula" ? deriveFormulaMetadata(food.name, food.brand, food.formulaSubtype, food.baseAnimalType)
    : food.category === "milk"  ? deriveMilkMetadata(food.name, food.brand)
    : deriveCheeseMetadata()

  return {
    id: -(i + 1),
    product_name: food.name,
    manufacturer: food.brand,
    functionality: null,
    precautions: null,
    daily_serving_count: food.defaultAmount,
    amount_per_serving: food.baseUnit === "ml" ? 100 : 1,
    serving_unit: food.baseUnit === "ml" ? "ml" : "장",
    category: food.category,
    base_unit: food.baseUnit === "ml" ? ("ml" as const) : ("장" as const),
    nutrients: Object.entries(food.nutrients).map(([key, value]) => {
      const [name, unit] = key.split("||")
      return { name, amount: value, unit }
    }),
    metadata,
  }
})
