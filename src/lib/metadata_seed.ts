/**
 * metadata_seed.ts — 기존 데이터에서 고신뢰 메타데이터 보수적 추출
 *
 * 원칙:
 *   high-confidence only — 확실한 것만. 애매하면 undefined.
 *   단순 규칙(키워드/정규식)만 사용, 복잡한 추론 금지.
 *   undefined ≠ false — "알 수 없음"과 "아님"을 구분.
 *   explicit ≠ derived — 파생값은 derivedAgeRangeMonths 등 별도 필드에만 기록.
 *
 * ─── explicit 값 (직접 확인된 항목) ─────────────────────────────────────────
 *
 *  formulaStage  → 제품명에 "\d단계" 패턴 존재 (formula only)
 *                  "압타밀 1단계" → 1  /  "임페리얼 XO 3단계" → 3
 *                  커버리지: formula 3/3 (100%)
 *
 *  brandLine     → 제품명에서 "N단계" suffix 제거한 임시 보조값 (Phase 15)
 *                  "압타밀 1단계" → "압타밀" / "앱솔루트 명작 2단계" → "앱솔루트 명작"
 *                  커버리지: formula 3/3 (100%)
 *                  주의: 공식 브랜드 식별자가 아닌 정규화 헬퍼
 *
 *  isOrganic     → 제품명·브랜드에 "유기농" 키워드
 *                  "상하 유기농 우유" → true, 나머지 → undefined
 *                  커버리지: 현재 데이터 1/6 (milk 50%)
 *                  주의: 키워드 없으면 false가 아닌 undefined (우리가 모르는 것)
 *
 *  allergens     → formula / milk / cheese 구조적 특성상 "우유" 포함
 *                  제품별 라벨과 무관하게 dairy 카테고리 = 우유 성분
 *                  커버리지: routine 식품 6/6 (100%)
 *
 *  subtype       → supplement 영양소명에서 probiotic/omega 키워드 매칭
 *                  커버리지: DB supplement 의존 (probiotic/omega 있는 제품만)
 *
 * ─── derived 값 (내부 파생값, 공식 정보 아님) ────────────────────────────────
 *
 *  derivedAgeRangeMonths → formulaStage에서 산업 표준으로 파생 (Phase 15.1)
 *                          1→[0,6] / 2→[6,12] / 3→[12,36]
 *                          UI에 노출 시 추정값임을 명시해야 함
 *                          커버리지: formula 3/3 (100%)
 *
 * ─── unknown 값 (명시 근거 없음 → undefined) ─────────────────────────────────
 *
 *  formulaSubtype → "standard"를 기본값으로 자동 입력하지 않음.
 *                   특수분유(goat/ha/lactose_free 등) 지시자가 없어도
 *                   "standard"를 확신할 수 없으므로 undefined.
 *                   외부 명시 데이터가 있을 때만 deriveFormulaMetadata 파라미터로 전달.
 *
 *  baseAnimalType → 제품명에 "산양" 등 명시 키워드 없으면 undefined.
 *                   도메인 지식("이 브랜드는 소 원유")만으로 "cow" 단언 금지.
 *                   외부 명시 데이터가 있을 때만 deriveFormulaMetadata 파라미터로 전달.
 *
 * ─── data_pipeline 위임 항목 ──────────────────────────────────────────────────
 *
 *  additives     → 전성분표 없이 추출 불가
 *  ingredients   → 전성분표 없이 추출 불가
 *  ageRangeMonths (explicit) → 공식 라벨 데이터 없이 설정 불가
 *  supplement 세부 subtype (vitamin/mineral/multi) → 기준 불분명
 *
 * ─── 비교 축 활성화 가능성 평가 ─────────────────────────────────────────────
 *
 *  "stage"    → formula 100% 커버. UI 필터 추가 시 활성화 가능.
 *  "organic"  → 현재 1/6 커버 (부분). UI 활성화는 coverage 보강 후.
 *  "allergens"→ routine 100%. supplement 0%. 축 활성화는 supplement 보강 후.
 *  나머지      → data_pipeline 없이 활성화 불가.
 */

import type { Product, ProductMetadata, ProductSubtype, FormulaSubtype } from "./types"

// ─── 분유 단계 추출 ───────────────────────────────────────────────────────────
// "\d단계" 패턴만. 브랜드명/모델명 내 숫자와 혼동 없음.
const FORMULA_STAGE_RE = /(\d)단계/

function extractFormulaStage(name: string): number | undefined {
  const m = name.match(FORMULA_STAGE_RE)
  return m ? parseInt(m[1], 10) : undefined
}

// ─── 분유 단계 → 월령 범위 파생 ─────────────────────────────────────────────
// 공식 제품 정보가 아닌 내부 파생값.
// 한국 조제분유 산업 표준(식약처/Codex 기준) 기반.
// 결과는 derivedAgeRangeMonths에만 설정 — ageRangeMonths(명시적 확인값)와 혼용 금지.

const FORMULA_STAGE_AGE_RANGE: Record<number, [number, number]> = {
  1: [0, 6],
  2: [6, 12],
  3: [12, 36],
}

function deriveAgeRangeFromStage(stage: number | undefined): [number, number] | undefined {
  if (stage === undefined) return undefined
  return FORMULA_STAGE_AGE_RANGE[stage]
}

// ─── 브랜드 라인명 정규화 헬퍼 ───────────────────────────────────────────────
// 제품명에서 "N단계" suffix를 제거하는 임시 보조값.
// 공식 브랜드 식별자가 아니며, 같은 브랜드 내 단계 묶음 용도로만 사용.
// 패턴이 없으면 undefined (단계 표기 없는 제품은 brandLine 불확실).

function normalizeBrandLine(name: string): string | undefined {
  const stripped = name.replace(/\s*\d단계\s*$/, "").trim()
  return stripped !== name.trim() ? stripped : undefined
}

// ─── 유기농 여부 ──────────────────────────────────────────────────────────────
// "유기농" 키워드만 인정. "유기" 단독은 제외 (유기산, 유기체 등 오인 방지).
// 키워드 없으면 undefined — false가 아님 (제품이 유기농이 아님을 단언하지 않음).

function extractIsOrganic(
  name: string,
  manufacturer: string | null,
): true | undefined {
  const text = `${name} ${manufacturer ?? ""}`
  return text.includes("유기농") ? true : undefined
}

// ─── 유제품 알레르기 ──────────────────────────────────────────────────────────
// formula / milk / cheese = 유제품 기반 구조적 특성.
// 개별 라벨 확인 없이 카테고리 수준에서 "우유" 포함 확신 가능.

const DAIRY_ALLERGENS: string[] = ["우유"]

// ─── supplement 서브타입 ──────────────────────────────────────────────────────
// 프로바이오틱스 / 오메가3 계열만 — 영양소명에서 직접 확인 가능.
// vitamin / mineral / multi 는 판별 기준 불분명 → 이번 단계에서 skip.

const PROBIOTIC_KEYWORDS = ["프로바이오틱스", "유산균", "Lactobacillus"]
const OMEGA_KEYWORDS     = ["오메가3", "DHA", "EPA", "rTG오메가"]

export function deriveSupplementSubtype(product: Product): ProductSubtype | undefined {
  const names = product.nutrients.map((n) => n.name)
  if (names.some((n) => PROBIOTIC_KEYWORDS.some((kw) => n.includes(kw)))) return "probiotic"
  if (names.some((n) => OMEGA_KEYWORDS.some((kw) => n.includes(kw))))     return "omega"
  return undefined
}

// ─── 카테고리별 메타데이터 추출 ───────────────────────────────────────────────

/**
 * formula 제품의 고신뢰 메타데이터.
 *
 * @param formulaSubtype — 외부에서 명시적으로 확인된 경우만 전달. 추정값 전달 금지.
 * @param baseAnimalType — 외부에서 명시적으로 확인된 경우만 전달. 추정값 전달 금지.
 */
export function deriveFormulaMetadata(
  name: string,
  manufacturer: string | null,
  formulaSubtype?: FormulaSubtype,
  baseAnimalType?: "cow" | "goat",
): ProductMetadata {
  const stage = extractFormulaStage(name)
  return {
    formulaStage:          stage,
    derivedAgeRangeMonths: deriveAgeRangeFromStage(stage),   // 파생값 — 공식 정보 아님
    brandLine:             normalizeBrandLine(name),          // 정규화 헬퍼 — 공식 식별자 아님
    formulaSubtype,        // 명시 근거 없으면 undefined (기본값 자동 입력 금지)
    baseAnimalType,        // 명시 근거 없으면 undefined (기본값 자동 입력 금지)
    isOrganic:             extractIsOrganic(name, manufacturer),
    allergens:             DAIRY_ALLERGENS,
  }
}

/** milk 제품의 고신뢰 메타데이터 */
export function deriveMilkMetadata(
  name: string,
  manufacturer: string | null,
): ProductMetadata {
  return {
    isOrganic: extractIsOrganic(name, manufacturer),
    allergens: DAIRY_ALLERGENS,
  }
}

/** cheese 제품의 고신뢰 메타데이터 */
export function deriveCheeseMetadata(): ProductMetadata {
  return {
    // isOrganic: 치즈는 이름만으로 확신 어려움 → undefined
    allergens: DAIRY_ALLERGENS,
  }
}

/** supplement 제품의 고신뢰 메타데이터 (현재는 비어 있음 — data_pipeline 위임) */
export function deriveSupplementMetadata(): ProductMetadata {
  return {}
}

/**
 * 제품 카테고리에 따라 고신뢰 메타데이터를 추출합니다.
 * 기존 `product.metadata`가 있으면 derived를 baseline으로 merge (기존 값 우선).
 */
export function deriveProductMetadata(product: Product): ProductMetadata {
  const derived: ProductMetadata = (() => {
    switch (product.category) {
      case "formula": return deriveFormulaMetadata(product.product_name, product.manufacturer)
      case "milk":    return deriveMilkMetadata(product.product_name, product.manufacturer)
      case "cheese":  return deriveCheeseMetadata()
      default:        return deriveSupplementMetadata()
    }
  })()
  // product.metadata가 있으면 그 값 우선 (DB/외부 파이프라인 데이터 존중)
  return { ...derived, ...product.metadata }
}
