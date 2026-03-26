/**
 * canonical_products.ts — canonical_product 테이블 read layer
 *
 * Phase 4A: 읽기 전용 조회 함수만 제공.
 * write / update / delete 금지.
 *
 * ── 클라이언트 선택 근거 ─────────────────────────────────────────────────────
 * canonical_product 테이블은 SELECT에 공개 RLS 정책이 적용되어 있으므로
 * anon 키(src/lib/supabase/client.ts)로 읽기 가능.
 * Next.js 클라이언트 컴포넌트 또는 서버 컴포넌트 어디서나 import 가능.
 *
 * ── 이 파일에서 하지 않는 것 ─────────────────────────────────────────────────
 * - 기존 products 테이블 대체 (공존 상태 유지)
 * - SearchClient.tsx 직접 수정
 * - write / upsert / delete
 *
 * ── 검증 예시 (런타임 확인용) ───────────────────────────────────────────────
 *   import { listCanonicalProducts } from "@/lib/canonical_products"
 *   const rows = await listCanonicalProducts()
 *   // 예상 반환 구조:
 *   // [
 *   //   {
 *   //     canonical_product_id: "formula_group_aptamil_profutura_uk_s1_powder_800g",
 *   //     brand: "Aptamil",
 *   //     line: "Profutura",
 *   //     country_version: "UK",
 *   //     stage: "1",
 *   //     confidence_score: "medium",
 *   //     source_count: 2,
 *   //     organic_flag: false,
 *   //     sources_seen: ["kr_food_regulatory_import", "official_brand_aptamil"],
 *   //     ...
 *   //   },
 *   //   { canonical_product_id: "formula_group_kendamil_goat_uk_s2_powder_800g", ... }
 *   // ]
 */

import { supabase } from "@/lib/supabase/client"
import type {
  CanonicalProduct,
  CanonicalProductCountryVersion,
  CanonicalProductStage,
} from "@/lib/types"

// ── 기본 조회 ──────────────────────────────────────────────────────────────────

/**
 * canonical_product 전체 목록을 브랜드 이름 오름차순으로 반환.
 * 오류 시 빈 배열 반환 (앱 중단 방지).
 */
export async function listCanonicalProducts(): Promise<CanonicalProduct[]> {
  const { data, error } = await supabase
    .from("canonical_product")
    .select("*")
    .order("brand", { ascending: true })

  if (error) {
    console.error("[canonical_products] listCanonicalProducts:", error.message)
    return []
  }

  return (data ?? []) as CanonicalProduct[]
}

/**
 * canonical_product_id로 단일 레코드 반환.
 * 존재하지 않거나 오류 시 null 반환.
 */
export async function getCanonicalProductById(
  id: string
): Promise<CanonicalProduct | null> {
  const { data, error } = await supabase
    .from("canonical_product")
    .select("*")
    .eq("canonical_product_id", id)
    .single()

  if (error) {
    // PGRST116 = row not found (정상 케이스) — 그 외는 로그 출력
    if (error.code !== "PGRST116") {
      console.error("[canonical_products] getCanonicalProductById:", error.message)
    }
    return null
  }

  return data as CanonicalProduct
}

// ── 분유 전용 필터 조회 ────────────────────────────────────────────────────────

/**
 * country_version 필터.
 * 예: listCanonicalProductsByCountry("UK")
 */
export async function listCanonicalProductsByCountry(
  countryVersion: CanonicalProductCountryVersion
): Promise<CanonicalProduct[]> {
  const { data, error } = await supabase
    .from("canonical_product")
    .select("*")
    .eq("country_version", countryVersion)
    .order("brand", { ascending: true })

  if (error) {
    console.error("[canonical_products] listCanonicalProductsByCountry:", error.message)
    return []
  }

  return (data ?? []) as CanonicalProduct[]
}

/**
 * stage 필터.
 * 예: listCanonicalProductsByStage("1")
 */
export async function listCanonicalProductsByStage(
  stage: CanonicalProductStage
): Promise<CanonicalProduct[]> {
  const { data, error } = await supabase
    .from("canonical_product")
    .select("*")
    .eq("stage", stage)
    .order("brand", { ascending: true })

  if (error) {
    console.error("[canonical_products] listCanonicalProductsByStage:", error.message)
    return []
  }

  return (data ?? []) as CanonicalProduct[]
}

/**
 * country_version + stage 복합 필터.
 * 예: listCanonicalProductsByFilter({ countryVersion: "UK", stage: "1" })
 */
export async function listCanonicalProductsByFilter(filter: {
  countryVersion?: CanonicalProductCountryVersion
  stage?: CanonicalProductStage
  brand?: string
}): Promise<CanonicalProduct[]> {
  let query = supabase.from("canonical_product").select("*")

  if (filter.countryVersion) {
    query = query.eq("country_version", filter.countryVersion)
  }
  if (filter.stage) {
    query = query.eq("stage", filter.stage)
  }
  if (filter.brand) {
    query = query.eq("brand", filter.brand)
  }

  const { data, error } = await query.order("brand", { ascending: true })

  if (error) {
    console.error("[canonical_products] listCanonicalProductsByFilter:", error.message)
    return []
  }

  return (data ?? []) as CanonicalProduct[]
}
