/**
 * comparison.ts — 제품 비교 탐색 역량 프로파일 (Comparison Capability Model)
 *
 * 설계 원칙:
 *   비교는 "불가/가능" 이진이 아니라 "어떤 축이 현재 활성화됐는가"의 문제입니다.
 *   카테고리별로 activeAxes / futureAxes 를 명시해 UI와 데이터 파이프라인이
 *   같은 언어로 대화할 수 있게 합니다.
 *
 * ─── 카테고리별 현황 ────────────────────────────────────────────────────────
 *
 * supplement (건강기능식품)
 *   active : nutrient-overlap — 영양소 이름 교집합 기반 유사 제품 탐색
 *   future : ingredients, additives, allergens, age-fit
 *
 * formula (분유)
 *   active : stage — Phase 13에서 활성화. formulaStage metadata가 seeded됨.
 *              현재 데이터: 3개 제품(각 단계 1개) → same-stage 결과 = 0.
 *              향후 분유 제품이 보강되면 stage 비교가 의미 있어집니다.
 *   future : organic, additives, allergens, ingredients
 *   비활성(영구): nutrient-overlap — 분유 간 영양소 구조 동일, 교집합 비교 무의미
 *
 * milk (우유)
 *   active : 없음  (formula와 같은 이유)
 *   future : organic, additives, allergens, ingredients
 *
 * cheese (치즈)
 *   active : 없음  (formula와 같은 이유)
 *   future : organic, additives, allergens, ingredients
 *
 * ─── 데이터 파이프라인 연결 지점 (Phase N 이후) ─────────────────────────────
 *
 *  "stage"       활성화 → products.metadata.formulaStage: number 필드 필요
 *  "organic"     활성화 → products.metadata.isOrganic: boolean 필드 필요
 *  "additives"   활성화 → products.metadata.additives: string[] 필드 필요
 *  "allergens"   활성화 → products.metadata.allergens: string[] 필드 필요
 *  "ingredients" 활성화 → products.metadata.ingredients: string[] 필드 필요
 *  "age-fit"     활성화 → products.metadata.ageRangeMonths: [number, number] 필드 필요
 *
 *  모든 metadata 필드는 optional — 데이터가 없어도 앱이 깨지지 않도록 설계됨
 */

import type { Product, ProductCategory } from "./types"

// ─── 비교 축 ─────────────────────────────────────────────────────────────────

export type ComparisonAxis =
  | "nutrient-overlap"  // 영양소 이름 교집합 기반 유사 제품 탐색 (현재 활성)
  | "stage"             // 분유 단계(1/2/3단계) 기반
  | "organic"           // 유기농 인증 여부
  | "additives"         // 첨가물 종류 기반
  | "allergens"         // 알레르기 유발 성분 기반
  | "ingredients"       // 전성분 기반
  | "age-fit"           // 개월수 적합성 기반

// ─── 역량 프로파일 ────────────────────────────────────────────────────────────

export type ComparisonCapability = {
  /** 현재 실제로 작동하는 비교 축 */
  activeAxes: ComparisonAxis[]
  /**
   * 카테고리 특성상 향후 고려할 수 있는 비교 축.
   * 약속이 아닌 설계 메모 — 데이터/UI가 준비되면 activeAxes로 승격됨.
   */
  futureAxes: ComparisonAxis[]
  /** activeAxes가 비어 있을 때 UX 안내 문구 */
  unavailableReason?: string
}

// ─── 카테고리별 프로파일 테이블 ───────────────────────────────────────────────

const CAPABILITY_TABLE: Record<ProductCategory, ComparisonCapability> = {
  supplement: {
    activeAxes: ["nutrient-overlap"],
    futureAxes: ["ingredients", "additives", "allergens", "age-fit"],
  },
  formula: {
    activeAxes: ["stage"],   // Phase 13: formulaStage metadata seeded → stage 축 활성
    futureAxes: ["organic", "additives", "allergens", "ingredients"],
    // unavailableReason 없음: stage 축이 있으므로 UX 안내 불필요
  },
  milk: {
    activeAxes: [],
    futureAxes: ["organic", "additives", "allergens", "ingredients"],
    unavailableReason: "현재 활성화된 성분 교집합 비교 방식이 이 카테고리에는 적용되지 않아요",
  },
  cheese: {
    activeAxes: [],
    futureAxes: ["organic", "additives", "allergens", "ingredients"],
    unavailableReason: "현재 활성화된 성분 교집합 비교 방식이 이 카테고리에는 적용되지 않아요",
  },
}

/** 제품의 비교 탐색 역량 프로파일을 반환합니다. */
export function getComparisonCapability(product: Product): ComparisonCapability {
  const cat = product.category ?? ("supplement" as ProductCategory)
  return CAPABILITY_TABLE[cat] ?? CAPABILITY_TABLE.supplement
}

// ─── stage 축 유틸 ───────────────────────────────────────────────────────────

/**
 * 같은 단계(formulaStage)인 formula 제품을 반환합니다.
 * metadata.formulaStage가 없는 제품은 포함하지 않습니다.
 *
 * 현재 데이터 주의: formula 3개가 각 단계 1개씩이므로 결과가 항상 0.
 * formula 데이터가 보강되면 의미 있는 결과를 반환합니다.
 */
export function getSameStageProducts(
  referenceProduct: Product,
  allProducts: Product[],
): Product[] {
  const stage = referenceProduct.metadata?.formulaStage
  if (!stage) return []
  return allProducts.filter(
    (p) =>
      p.id !== referenceProduct.id &&
      p.category === "formula" &&
      p.metadata?.formulaStage === stage,
  )
}

// ─── 루틴 식품 판별 ───────────────────────────────────────────────────────────
// formula / milk / cheese = 매일 먹는 기본 식품.
// UX 분기(선택 방식·아이콘·비교 제한)에서 supplement와 다르게 처리됩니다.

export const ROUTINE_CATEGORIES = new Set<ProductCategory>(["formula", "milk", "cheese"])

/** 루틴 식품(분유·우유·치즈) 여부 */
export function isRoutineProduct(product: Product): boolean {
  return ROUTINE_CATEGORIES.has(product.category ?? ("" as ProductCategory))
}
