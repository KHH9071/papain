/**
 * routine_foods.ts — 루틴 식품 유틸리티
 *
 * 분유·우유·치즈 모두 canonical_product 파이프라인으로 이관 완료.
 * 이 파일에는 카테고리 아이콘/라벨과 영양소 합산 유틸만 남김.
 *
 * ROUTINE_PRODUCTS는 하위 호환을 위해 빈 배열로 유지.
 */

export type RoutineFood = {
  id: string
  name: string
  brand: string
  category: "formula" | "milk" | "cheese"
  baseUnit: "ml" | "slice"
  defaultAmount: number
  nutrients: Record<string, number>
}

export type SelectedRoutineFood = {
  food: RoutineFood
  amountPerDay: number
}

export const ROUTINE_FOODS: RoutineFood[] = []

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

// ─── 하위 호환: ROUTINE_PRODUCTS (빈 배열) ─────────────────────────────────
import type { Product } from "./types"

/**
 * ROUTINE_PRODUCTS — 모든 제품이 canonical 파이프라인으로 이관되어 빈 배열.
 * SearchClient에서 아직 참조하므로 export 유지.
 */
export const ROUTINE_PRODUCTS: Product[] = []
