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
 * - milk_group_ 접두사로 우유 제품 자동 감지 → category: "milk"
 * - cheese_group_ 접두사로 치즈 제품 자동 감지 → category: "cheese"
 */

import type { CanonicalProduct, Product, Nutrient, ProductMetadata } from "./types"
import nutrientDb from "./formula_nutrient_db.json"

// ── 한국어 브랜드명 매핑 ─────────────────────────────────────────────────────

const BRAND_KO: Record<string, string> = {
  // 해외 브랜드
  Aptamil:     "압타밀",
  Kendamil:    "켄다밀",
  HiPP:        "힙",
  Holle:       "홀레",
  Lebenswert:  "레벤스베르트",
  Kabrita:     "카브리타",
  Bubs:        "버브스",
  Similac:     "시밀락",
  Enfamil:     "엔파밀",
  // 한국 브랜드 (이미 한글이지만 매핑 일관성 유지)
  "남양유업":       "남양유업",
  "매일유업":       "매일유업",
  "일동후디스":     "일동후디스",
  "롯데푸드":       "롯데푸드",
  // 우유·치즈 브랜드
  "서울우유협동조합": "서울우유",
  "연세우유":       "연세우유",
  "동원F&B":        "동원F&B",
  "소와나무":       "소와나무",
  "빙그레":         "빙그레",
  "정식품":         "정식품",
  "푸르밀":         "푸르밀",
  "건국우유":       "건국우유",
  "서울우유":       "서울우유",
}

const LINE_KO: Record<string, string> = {
  // 해외 라인
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
  // 한국 라인 (이미 한글)
  "임페리얼 XO":        "임페리얼 XO",
  "아이엠마더":          "아이엠마더",
  "앱솔루트 명작":       "앱솔루트 명작",
  "산양분유":            "산양분유",
  "트루맘":              "트루맘",
  "파스퇴르 위드맘":     "파스퇴르 위드맘",
  "압타밀":              "압타밀",
  // 우유 라인
  "서울우유":                  "서울우유",
  "앙팡 우유":                 "앙팡 우유",
  "앙팡 DHA 우유":             "앙팡 DHA 우유",
  "앙팡 유기농 우유":          "앙팡 유기농 우유",
  "유기농 우유":               "유기농 우유",
  "저지방 우유":               "저지방 우유",
  "매일우유":                  "매일우유",
  "상하목장 유기농 우유":      "상하목장 유기농 우유",
  "상하목장 바른목장 우유":    "상하목장 바른목장 우유",
  "상하목장 저지방 우유":      "상하목장 저지방 우유",
  "소화가 잘되는 우유":        "소화가 잘되는 우유",
  "상하키즈 우유":             "상하키즈 우유",
  "셀렉스 키즈 우유":          "셀렉스 키즈 우유",
  "맛있는 우유 GT":            "맛있는 우유 GT",
  "맛있는 우유 GT 저지방":     "맛있는 우유 GT 저지방",
  "아이꼬야 우유":             "아이꼬야 우유",
  "아이꼬야 유기농 우유":      "아이꼬야 유기농 우유",
  "연세우유 전용목장":         "연세우유 전용목장",
  "연세 유기농 우유":          "연세 유기농 우유",
  "키즈 우유":                 "키즈 우유",
  "하이키드 우유":             "하이키드 우유",
  "파스퇴르 우유":             "파스퇴르 우유",
  "파스퇴르 바른목장 유기농":  "파스퇴르 바른목장 유기농",
  "파스퇴르 저지방 우유":      "파스퇴르 저지방 우유",
  "빙그레 흰 우유":            "빙그레 흰 우유",
  "바나나맛 우유":             "바나나맛 우유",
  "딸기맛 우유":               "딸기맛 우유",
  "가야농장 우유":             "가야농장 우유",
  "검은콩 우유":               "검은콩 우유",
  "건국우유":                  "건국우유",
  // 치즈 라인
  "앙팡 아기치즈 1단계":       "앙팡 아기치즈 1단계",
  "앙팡 아기치즈 2단계":       "앙팡 아기치즈 2단계",
  "앙팡 아기치즈 3단계":       "앙팡 아기치즈 3단계",
  "앙팡 DHA 아기치즈":         "앙팡 DHA 아기치즈",
  "앙팡 칼슘치즈":             "앙팡 칼슘치즈",
  "앙팡 유기농 아기치즈":      "앙팡 유기농 아기치즈",
  "체다 슬라이스 치즈":        "체다 슬라이스 치즈",
  "상하 아기치즈 1단계":       "상하 아기치즈 1단계",
  "상하 아기치즈 2단계":       "상하 아기치즈 2단계",
  "상하 유기농 아기치즈":      "상하 유기농 아기치즈",
  "상하키즈 치즈":             "상하키즈 치즈",
  "상하 스트링치즈":           "상하 스트링치즈",
  "상하 슬라이스 치즈":        "상하 슬라이스 치즈",
  "드빈치 자연방목 아기치즈":  "드빈치 자연방목 아기치즈",
  "드빈치 유기농 아기치즈":    "드빈치 유기농 아기치즈",
  "덴마크 아기치즈":           "덴마크 아기치즈",
  "덴마크 유기농 아기치즈":    "덴마크 유기농 아기치즈",
  "덴마크 아이 간식치즈":      "덴마크 아이 간식치즈",
  "덴마크 슬라이스 치즈":      "덴마크 슬라이스 치즈",
  "1등급 아기치즈":            "1등급 아기치즈",
  "유기농 아기치즈":           "유기농 아기치즈",
  "끼리 아기치즈":             "끼리 아기치즈",
  "끼리 크림치즈 포션":        "끼리 크림치즈 포션",
  "베지밀 아기치즈":           "베지밀 아기치즈",
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

// ── 카테고리 감지 ────────────────────────────────────────────────────────────

function detectCategory(cp: CanonicalProduct): "formula" | "milk" | "cheese" {
  if (cp.canonical_product_id.startsWith("milk_group_")) return "milk"
  if (cp.canonical_product_id.startsWith("cheese_group_")) return "cheese"
  return "formula"
}

// ── 우유·치즈용 한국어 제품명 (단계 제외, 브랜드+라인만) ─────────────────────────

function buildSimpleKoreanName(cp: CanonicalProduct): string {
  const brand = BRAND_KO[cp.brand] ?? cp.brand
  const line  = cp.line ? (LINE_KO[cp.line] ?? cp.line) : ""
  const parts = [brand, line].filter(Boolean)
  return parts.join(" ")
}

// ── 변환 함수 ────────────────────────────────────────────────────────────────

export function canonicalToProduct(cp: CanonicalProduct, index: number): Product {
  const category = detectCategory(cp)
  const isFormula = category === "formula"
  const isCheese = category === "cheese"
  const stageNum = isFormula ? STAGE_NUM[cp.stage] : undefined
  const ageRange = isFormula ? STAGE_AGE_RANGE[cp.stage] : undefined
  const country  = COUNTRY_KO[cp.country_version] ?? ""

  const isMilk = category === "milk"
  const milkTarget = isMilk
    ? (cp.age_range_text ? "toddler" as const : "general" as const)
    : undefined

  const metadata: ProductMetadata = {
    formulaStage:          stageNum,
    derivedAgeRangeMonths: ageRange,
    brandLine:             BRAND_KO[cp.brand] ?? cp.brand,
    formulaSubtype:        cp.milk_base === "goat" ? "goat" : undefined,
    baseAnimalType:        (cp.milk_base === "cow" || cp.milk_base === "goat") ? cp.milk_base : undefined,
    isOrganic:             cp.organic_flag ? true : undefined,
    allergens:             ["우유"],
    milkTarget,
  }

  return {
    id: -(100 + index),
    product_name: isFormula ? buildKoreanName(cp) : buildSimpleKoreanName(cp),
    manufacturer: `${BRAND_KO[cp.brand] ?? cp.brand}${country ? ` · ${country}` : ""}`,
    functionality: cp.evidence_grade
      ? `검증등급 ${cp.evidence_grade} · ${cp.source_count}개 출처 확인`
      : `${cp.source_count}개 출처 확인`,
    precautions: null,
    daily_serving_count: isCheese ? 2 : (isFormula ? 800 : 400),
    amount_per_serving: isCheese ? 1 : 100,
    serving_unit: isCheese ? "장" : "ml",
    category,
    base_unit: isCheese ? "장" as const : "ml" as const,
    nutrients: getNutrients(cp.canonical_product_id),
    metadata,
    canonical: {
      evidenceGrade: cp.evidence_grade ?? null,
      recallStatus: cp.recall_status ?? null,
      recallSourceUrl: cp.recall_source_url ?? null,
      sourceCount: cp.source_count,
      countryVersion: cp.country_version,
      isRecommendable: cp.is_recommendable ?? null,
    },
  }
}

export function canonicalProductsToProducts(cps: CanonicalProduct[]): Product[] {
  return cps.map((cp, i) => canonicalToProduct(cp, i))
}
