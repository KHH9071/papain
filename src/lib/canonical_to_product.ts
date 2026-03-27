/**
 * canonical_to_product.ts — CanonicalProduct → Product 변환 유틸리티
 *
 * canonical_product 테이블 레코드를 기존 Product 타입으로 변환하여
 * MobileProductCard, Zustand basket, 용량 모달 등 기존 UI 인프라에서
 * 동일하게 작동하도록 한다.
 *
 * - 한국어 브랜드/라인 매핑 포함
 * - formula_nutrient_db.json에서 per-100ml 영양소 데이터 로드
 * - ID는 -100 이하 음수로 기존 ROUTINE_PRODUCTS(-1~-6)와 충돌 방지
 */

import type { CanonicalProduct, Product, Nutrient, ProductMetadata } from "./types"
import nutrientDb from "./formula_nutrient_db.json"

// ── 한국어 브랜드명 매핑 ─────────────────────────────────────────────────────

const BRAND_KO: Record<string, string> = {
  Aptamil:     "압타밀",
  Kendamil:    "켄다밀",
  HiPP:        "힙",
  Holle:       "홀레",
  Lebenswert:  "레벤스베르트",
  Kabrita:     "카브리타",
  Bubs:        "버브스",
  Similac:     "시밀락",
  Enfamil:     "엔파밀",
}

const LINE_KO: Record<string, string> = {
  Profutura:            "프로푸투라",
  Goat:                 "산양",
  Classic:              "클래식",
  Organic:              "오가닉",
  Bio:                  "비오",
  "Bio Goat":           "비오 산양",
  "BIO COMBIOTIK":      "비오 콤비오틱",
  Gold:                 "골드",
  "Organic Grass Fed":  "유기농 목초",
  "360 Total Care":     "360 토탈케어",
  NeuroPro:             "뉴로프로",
}

const COUNTRY_KO: Record<string, string> = {
  UK: "영국", DE: "독일", US: "미국", AU: "호주",
  EU: "유럽", KR: "한국", Unknown: "",
}

const STAGE_KO: Record<string, string> = {
  PRE: "PRE단계", "1": "1단계", "2": "2단계", "3": "3단계", "4": "4단계",
  unknown: "",
}

const STAGE_NUM: Record<string, number | undefined> = {
  PRE: 0, "1": 1, "2": 2, "3": 3, "4": 4, unknown: undefined,
}

const STAGE_AGE_RANGE: Record<string, [number, number] | undefined> = {
  PRE: [0, 6], "1": [0, 6], "2": [6, 12], "3": [12, 36], "4": [12, 36],
  unknown: undefined,
}

// ── 영양소 DB에서 Nutrient[] 변환 ─────────────────────────────────────────────

type NutrientProfile = { source: string; nutrients: Record<string, number> }
const profiles = (nutrientDb as { profiles: Record<string, NutrientProfile> }).profiles

function getNutrients(canonicalProductId: string): Nutrient[] {
  const profile = profiles[canonicalProductId]
  if (!profile) return []
  return Object.entries(profile.nutrients).map(([key, value]) => {
    const [name, unit] = key.split("||")
    return { name, amount: value, unit }
  })
}

// ── 한국어 제품명 생성 ───────────────────────────────────────────────────────

function buildKoreanName(cp: CanonicalProduct): string {
  const brand = BRAND_KO[cp.brand] ?? cp.brand
  const line  = cp.line ? (LINE_KO[cp.line] ?? cp.line) : ""
  const stage = STAGE_KO[cp.stage] ?? ""
  const size  = cp.package_size_value ? `${cp.package_size_value}${cp.package_size_unit ?? "g"}` : ""
  const parts = [brand, line, stage, size].filter(Boolean)
  return parts.join(" ")
}

// ── 변환 함수 ────────────────────────────────────────────────────────────────

export function canonicalToProduct(cp: CanonicalProduct, index: number): Product {
  const stageNum = STAGE_NUM[cp.stage]
  const ageRange = STAGE_AGE_RANGE[cp.stage]
  const country  = COUNTRY_KO[cp.country_version] ?? ""

  const metadata: ProductMetadata = {
    formulaStage:          stageNum,
    derivedAgeRangeMonths: ageRange,
    brandLine:             BRAND_KO[cp.brand] ?? cp.brand,
    formulaSubtype:        cp.milk_base === "goat" ? "goat" : undefined,
    baseAnimalType:        (cp.milk_base === "cow" || cp.milk_base === "goat") ? cp.milk_base : undefined,
    isOrganic:             cp.organic_flag ? true : undefined,
    allergens:             ["우유"],
  }

  return {
    id: -(100 + index),
    product_name: buildKoreanName(cp),
    manufacturer: `${BRAND_KO[cp.brand] ?? cp.brand}${country ? ` · ${country}` : ""}`,
    functionality: cp.evidence_grade
      ? `검증등급 ${cp.evidence_grade} · ${cp.source_count}개 출처 확인`
      : `${cp.source_count}개 출처 확인`,
    precautions: null,
    daily_serving_count: 800,
    amount_per_serving: 100,
    serving_unit: "ml",
    category: "formula",
    base_unit: "ml" as const,
    nutrients: getNutrients(cp.canonical_product_id),
    metadata,
  }
}

export function canonicalProductsToProducts(cps: CanonicalProduct[]): Product[] {
  return cps.map((cp, i) => canonicalToProduct(cp, i))
}
