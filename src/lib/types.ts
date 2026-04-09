// ─── 제품 분류 ────────────────────────────────────────────────────────────────

export type ProductCategory = "supplement" | "formula" | "milk" | "cheese"

/**
 * 제품 서브타입 — 현재 DB에는 없음. 향후 products 테이블에 subtype 컬럼 추가 시 사용.
 *
 * supplement 서브타입 예시:
 *   "vitamin"   — 비타민류 (비타민D, 비타민C 등)
 *   "mineral"   — 미네랄류 (칼슘, 철, 아연 등)
 *   "probiotic" — 프로바이오틱스
 *   "omega"     — 오메가3 / DHA
 *   "multi"     — 복합 영양제
 *
 * open union(string)으로 남겨두어 DB enum 확정 전 자유롭게 확장 가능.
 */
export type ProductSubtype = "vitamin" | "mineral" | "probiotic" | "omega" | "multi" | string

/**
 * 분유 서브타입 — formula 전용.
 *
 *   "standard"     — 일반 조제분유 (소 원유 기반)
 *   "goat"         — 산양분유 (산양 원유 기반)
 *   "ha"           — 완전가수분해 분유 (cow HA, 알레르기 대응)
 *   "partial_ha"   — 부분가수분해 분유
 *   "lactose_free" — 무유당 분유
 *   "comfort"      — 소화 편의 분유 (변비·가스 대응)
 *
 * 명확한 근거 없이 "standard"로 가정하지 말 것 —
 * 이름/라벨에서 특수분유 지시자가 없어도 standard임을 확신할 수 없는 경우 undefined.
 */
export type FormulaSubtype =
  | "standard"
  | "goat"
  | "ha"
  | "partial_ha"
  | "lactose_free"
  | "comfort"
  | string  // open — 향후 추가 타입 수용

// ─── 비교 축 메타데이터 ───────────────────────────────────────────────────────
//
// 각 비교 축(ComparisonAxis)이 활성화될 때 필요한 데이터 필드.
// 현재는 모든 필드가 optional — 데이터가 없어도 앱이 동작함.
// 향후 data_pipeline에서 products 테이블 또는 별도 테이블에서 공급.

export type ProductMetadata = {
  /**
   * 분유 단계 — "stage" 비교 축 활성화에 사용.
   * 예: 1 (0~6개월), 2 (6~12개월), 3 (12~36개월)
   */
  formulaStage?: number

  /**
   * 분유 적합 월령 범위 [최소, 최대] — 공식 제품 정보(라벨·DB)에서 직접 확인된 경우만.
   * 현재 routine_foods 데이터에는 설정된 값 없음.
   * stage 기반 파생값은 derivedAgeRangeMonths를 사용할 것.
   */
  ageRangeMonths?: [number, number]

  /**
   * formulaStage에서 한국 조제분유 산업 표준으로 파생한 월령 범위.
   * 공식 제품 정보가 아닌 내부 계산값 — UI에서 추정값으로 표시해야 함.
   * 1→[0,6] / 2→[6,12] / 3→[12,36]  (metadata_seed.ts FORMULA_STAGE_AGE_RANGE 참조)
   */
  derivedAgeRangeMonths?: [number, number]

  /**
   * 분유 서브타입 — "subtype" 비교 축 활성화에 사용.
   * 제품명·라벨에 명시적 지시자가 있을 때만 설정. 없으면 undefined.
   * "standard"를 기본 추정값으로 자동 입력하지 말 것.
   * @see FormulaSubtype
   */
  formulaSubtype?: FormulaSubtype

  /**
   * 원유 동물 기반 — "base-animal" 비교 축 활성화에 사용.
   * 제품명·브랜드에서 확실히 식별되는 경우만 설정.
   * "goat" 등 특수 표기가 없다는 이유만으로 "cow"로 단언하지 말 것.
   */
  baseAnimalType?: "cow" | "goat"

  /**
   * 제품명 정규화 헬퍼 — "N단계" suffix를 제거한 임시 표기.
   * 같은 브랜드 내 단계 묶음에 활용하는 보조값이며, 공식 브랜드 식별자가 아님.
   * 예: "압타밀 1단계" → "압타밀"  (단계 표기 없는 제품은 undefined)
   */
  brandLine?: string

  /** 유기농 인증 여부 — "organic" 비교 축 활성화에 사용. */
  isOrganic?: boolean

  /**
   * 주요 첨가물 목록 — "additives" 비교 축 활성화에 사용.
   * 예: ["산화방지제", "유화제", "합성향료"]
   */
  additives?: string[]

  /**
   * 알레르기 유발 성분 목록 — "allergens" 비교 축 활성화에 사용.
   * 예: ["우유", "대두", "밀"]
   */
  allergens?: string[]

  /**
   * 전성분 키워드 목록 — "ingredients" 비교 축 활성화에 사용.
   * 전성분 텍스트를 토큰화한 배열, 또는 원문 그대로 저장.
   */
  ingredients?: string[]

  /**
   * 우유 대상 — milk 카테고리 하위 필터에 사용.
   * "toddler" = 유아용 우유, "general" = 일반 우유
   */
  milkTarget?: "toddler" | "general"
}

// ─── 영양소 ───────────────────────────────────────────────────────────────────

export type Nutrient = {
  name: string
  amount: number
  unit: string
}

// ─── 제품 ─────────────────────────────────────────────────────────────────────

export type Product = {
  id: number
  product_name: string
  manufacturer: string | null
  functionality: string | null
  precautions: string | null
  daily_serving_count: number | null
  amount_per_serving: number | null
  serving_unit: string | null
  nutrients: Nutrient[]
  /** 제품 분류: supplement(건기식) | formula(분유) | milk(우유) | cheese(치즈) */
  category?: ProductCategory
  /**
   * 제품 서브타입 — 현재 DB에 없음, 향후 확장용.
   * @see ProductSubtype
   */
  subtype?: ProductSubtype
  /** 영양소 기준 단위: serving=1회 제공량 기준, ml=per 100ml, 장=per slice */
  base_unit?: "serving" | "ml" | "장"
  /**
   * 비교 축 메타데이터 — 현재 DB에 없음, 향후 데이터 파이프라인에서 공급.
   * 없어도 앱이 동작하므로 optional.
   * @see ProductMetadata
   */
  metadata?: ProductMetadata
  /** canonical_product 원본 데이터 (검증등급, 리콜 등). canonicalToProduct에서 채움. */
  canonical?: {
    evidenceGrade: string | null
    recallStatus: string | null
    recallSourceUrl: string | null
    sourceCount: number
    countryVersion: string
    isRecommendable: boolean | null
  }
}

// ─── 집계 영양소 ──────────────────────────────────────────────────────────────

export type AggregatedNutrient = {
  name: string
  amount: number
  unit: string
}

// ─── Canonical Product (Phase 4A — DB Option B) ───────────────────────────────
//
// canonical_product 테이블 레코드를 표현하는 타입.
// 기존 Product / ProductMetadata 타입과 섞지 않는다.
// 출처: data_pipeline/schema/canonical_product.sql
// 정책: PHASE3B_POLICY_LOCK.md

export type CanonicalProductConfidence = "high" | "medium" | "low"

/** taxonomy YAML 허용값과 동일. "unknown" = stage 미확인 (Policy 3). */
export type CanonicalProductStage = "PRE" | "1" | "2" | "3" | "4" | "unknown"

/** Policy 2: 원산지 기준. "Unknown" = country_version 미확인. */
export type CanonicalProductCountryVersion =
  | "KR" | "DE" | "UK" | "EU" | "AU" | "US" | "Unknown"

export type CanonicalProductMilkBase = "cow" | "goat" | "plant" | "unknown"

export type CanonicalProductProteinType =
  | "standard"
  | "partial_hydrolyzed"
  | "full_hydrolyzed"
  | "amino_acid"
  | "unknown"

export type CanonicalProductFormulaType =
  | "infant_formula"
  | "follow_on_formula"
  | "growing_up_milk"
  | "specialty_formula"
  | "unknown"

export type CanonicalProductForm = "powder" | "liquid" | "ready_to_feed" | "unknown"

/** Phase 5G Evidence Grade. */
export type CanonicalProductEvidenceGrade =
  | "Verified-A"
  | "Verified-B"
  | "Verified-C"
  | "Restricted"
  | "Unverified"

/** Phase 5H Recall Status. */
export type CanonicalProductRecallStatus =
  | "unknown"
  | "none"
  | "active"
  | "resolved"
  | "batch_specific"

export type CanonicalProduct = {
  /** 파이프라인 생성 ID. 예: "formula_group_aptamil_profutura_uk_s1_powder_800g" */
  canonical_product_id: string
  brand: string
  line: string | null
  normalized_name: string
  country_version: CanonicalProductCountryVersion
  /** Policy 3: 불명확 시 "unknown". age_range_text로 추론 금지. */
  stage: CanonicalProductStage
  age_range_text: string | null
  milk_base: CanonicalProductMilkBase | null
  protein_type: CanonicalProductProteinType | null
  formula_type: CanonicalProductFormulaType | null
  form: CanonicalProductForm | null
  package_size_value: string | null
  package_size_unit: string | null
  /** DB boolean. JSON 파이프라인에서는 "true"/"false" 문자열 → boolean 변환됨. */
  organic_flag: boolean
  source_count: number
  /** JSONB 배열. 예: ["kr_food_regulatory_import", "official_brand_aptamil"] */
  sources_seen: string[]
  /** Policy 4 (C2): auto-approve 기준은 "high" 또는 "medium". */
  confidence_score: CanonicalProductConfidence
  review_status: string
  reviewed_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  /** Phase 5G: Evidence grade. */
  evidence_grade: CanonicalProductEvidenceGrade | null
  evidence_source_1_type: string | null
  evidence_source_1_url: string | null
  evidence_source_2_type: string | null
  evidence_source_2_url: string | null
  /** Phase 5H: Recall tracking. */
  recall_status: CanonicalProductRecallStatus | null
  recall_jurisdiction: string | null
  recall_source_url: string | null
  recall_checked_at: string | null
  /** Phase 5G: Policy flags. */
  requires_human_approval: boolean | null
  is_recommendable: boolean | null
  is_searchable: boolean | null
  is_comparable: boolean | null
}
