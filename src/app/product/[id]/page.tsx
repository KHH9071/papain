"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import { getAgeGroup, getRecommendedIntakes, getUpperLimits } from "@/lib/kdri_data"
import { getMultiplier } from "@/lib/nutrition_utils"
import { CATEGORY_ICON, CATEGORY_LABEL } from "@/lib/routine_foods"
import { canonicalProductsToProducts } from "@/lib/canonical_to_product"
import type { Product, Nutrient, CanonicalProduct } from "@/lib/types"
import type { ProductOffer } from "@/lib/commerce"

// ── 카테고리별 색상 ──────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  formula: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  milk:    { bg: "bg-sky-50",  text: "text-sky-600",  border: "border-sky-200" },
  cheese:  { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  supplement: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
}

// ── KDRI 비율 계산 ───────────────────────────────────────────────────────────
function getNutrientRatio(
  n: Nutrient,
  multiplier: number,
  ri: Record<string, { ri: number }>,
  ul: Record<string, number>,
) {
  const daily = n.amount * multiplier
  const key = `${n.name}||${n.unit}`
  // 비타민D IU→μg 변환
  const riKey = n.name === "비타민D" && n.unit === "IU" ? "비타민D||μg" : key
  const compareAmount = n.name === "비타민D" && n.unit === "IU" ? daily / 40 : daily

  const riVal = ri[riKey]?.ri
  const ulVal = ul[riKey]

  return {
    daily: parseFloat(daily.toFixed(2)),
    riPct: riVal ? Math.round((compareAmount / riVal) * 100) : null,
    ulPct: ulVal ? Math.round((compareAmount / ulVal) * 100) : null,
    isExceeded: ulVal ? compareAmount > ulVal : false,
    isDeficient: riVal ? compareAmount < riVal : false,
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const { selectedProducts, toggleProduct, setProductVolume, monthsOld } = useAppStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [offers, setOffers]   = useState<ProductOffer[]>([])
  const [offersEnabled, setOffersEnabled] = useState(false)

  const isSelected = selectedProducts.some((p) => p.id === id)
  const selectedVersion = selectedProducts.find((p) => p.id === id)

  // KDRI 데이터
  const ageGroup = getAgeGroup(monthsOld)
  const ri = useMemo(() => getRecommendedIntakes(monthsOld), [monthsOld])
  const ul = useMemo(() => getUpperLimits(monthsOld), [monthsOld])

  useEffect(() => {
    if (id < 0) {
      // 음수 id → 먼저 바구니에서 찾고, 없으면 canonical_product에서 변환
      const found = selectedProducts.find((p) => p.id === id)
      if (found) {
        setProduct(found)
        setLoading(false)
        return
      }
      // canonical_product 전체 조회 후 동일 인덱스로 변환
      const supabase = createClient()
      supabase
        .from("canonical_product")
        .select("*")
        .order("brand", { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            const converted = canonicalProductsToProducts(data as CanonicalProduct[])
            const match = converted.find((p) => p.id === id)
            if (match) setProduct(match)
          }
          setLoading(false)
        })
      return
    }

    // 양수 id → Supabase products 테이블
    const supabase = createClient()
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProduct(data as Product)
        setLoading(false)
      })
  }, [id, selectedProducts])

  // 구매 링크 조회
  const fetchOffers = useCallback(async (name: string) => {
    try {
      const res = await fetch(`/api/commerce?q=${encodeURIComponent(name)}`)
      if (res.ok) {
        const data = await res.json()
        setOffers(data.offers ?? [])
        setOffersEnabled(data.enabled ?? false)
      }
    } catch { /* 구매 링크 실패는 무시 */ }
  }, [])

  useEffect(() => {
    if (product?.product_name) fetchOffers(product.product_name)
  }, [product?.product_name, fetchOffers])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-5">
        <p className="text-gray-400 font-bold text-sm mb-4">제품을 찾을 수 없어요</p>
        <button onClick={() => router.back()} className="text-orange-500 font-bold text-sm">
          뒤로 가기
        </button>
      </div>
    )
  }

  const cat = product.category ?? "supplement"
  const catColor = CAT_COLORS[cat] ?? CAT_COLORS.supplement
  const catIcon = CATEGORY_ICON[cat as "formula" | "milk" | "cheese"] ?? "💊"
  const catLabel = CATEGORY_LABEL[cat as "formula" | "milk" | "cheese"] ?? "건강기능식품"
  const multiplier = getMultiplier(selectedVersion ?? product)
  const hasNutrients = product.nutrients.length > 0
  const meta = product.metadata

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 z-20 px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-900 truncate flex-1">제품 상세</h1>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-28">

        {/* 제품 기본 정보 */}
        <section className="bg-white px-5 pt-6 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{catIcon}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${catColor.bg} ${catColor.text}`}>
              {catLabel}
            </span>
            {meta?.formulaStage && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                {meta.formulaStage}단계
              </span>
            )}
            {meta?.isOrganic && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-600">
                유기농
              </span>
            )}
            {meta?.baseAnimalType === "goat" && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">
                산양
              </span>
            )}
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 leading-tight mb-1">
            {product.product_name}
          </h2>
          <p className="text-sm text-gray-400 font-medium">{product.manufacturer}</p>
          {product.functionality && (
            <p className="text-xs text-violet-500 font-bold mt-2 bg-violet-50 px-3 py-2 rounded-lg">
              {product.functionality}
            </p>
          )}
        </section>

        {/* 제품 속성 */}
        {(meta?.derivedAgeRangeMonths || product.daily_serving_count || product.serving_unit) && (
          <section className="bg-white mt-2 px-5 py-5">
            <p className="text-xs font-medium text-gray-400 mb-3">제품 정보</p>
            <div className="grid grid-cols-2 gap-3">
              {meta?.derivedAgeRangeMonths && (
                <InfoCell label="적합 월령" value={`${meta.derivedAgeRangeMonths[0]}~${meta.derivedAgeRangeMonths[1]}개월`} />
              )}
              {product.daily_serving_count && product.serving_unit && (
                <InfoCell
                  label="기본 섭취량"
                  value={`${product.daily_serving_count}${product.serving_unit}/일`}
                />
              )}
              {meta?.brandLine && (
                <InfoCell label="브랜드 라인" value={meta.brandLine} />
              )}
              {meta?.allergens && meta.allergens.length > 0 && (
                <InfoCell label="알레르기" value={meta.allergens.join(", ")} />
              )}
            </div>
          </section>
        )}

        {/* 영양 성분표 */}
        {hasNutrients && (
          <section className="bg-white mt-2 px-5 py-5">
            <p className="text-xs font-medium text-gray-400 mb-3">
              영양 성분 ({product.base_unit === "장" ? "1장 기준" : "100ml 기준"})
            </p>
            <div className="space-y-1">
              {product.nutrients.map((n, i) => {
                const ratio = getNutrientRatio(n, multiplier, ri, ul)
                return (
                  <NutrientRow
                    key={i}
                    name={n.name}
                    amount={n.amount}
                    unit={n.unit}
                    daily={ratio.daily}
                    riPct={ratio.riPct}
                    isExceeded={ratio.isExceeded}
                    isDeficient={ratio.isDeficient}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* 주의사항 */}
        {product.precautions && (
          <section className="bg-white mt-2 px-5 py-5">
            <p className="text-xs font-medium text-gray-400 mb-2">주의사항</p>
            <p className="text-sm text-gray-600 leading-relaxed">{product.precautions}</p>
          </section>
        )}

        {/* 검증 정보 */}
        {product.canonical && (
          <section className="bg-white mt-2 px-5 py-5">
            <p className="text-xs font-medium text-gray-400 mb-3">검증 정보</p>
            <div className="grid grid-cols-2 gap-3">
              {product.canonical.evidenceGrade && (
                <TrustCell
                  label="검증 등급"
                  value={product.canonical.evidenceGrade}
                  cls={product.canonical.evidenceGrade.startsWith("Verified")
                    ? "text-emerald-600"
                    : "text-amber-600"
                  }
                />
              )}
              <TrustCell
                label="출처 확인"
                value={`${product.canonical.sourceCount}개 소스`}
              />
              {product.canonical.countryVersion && product.canonical.countryVersion !== "Unknown" && (
                <TrustCell label="제조국" value={product.canonical.countryVersion} />
              )}
              {product.canonical.recallStatus && product.canonical.recallStatus !== "unknown" && (
                <TrustCell
                  label="리콜 상태"
                  value={product.canonical.recallStatus === "none" ? "이상 없음" :
                         product.canonical.recallStatus === "active" ? "리콜 진행 중" :
                         product.canonical.recallStatus === "resolved" ? "리콜 해결됨" : product.canonical.recallStatus}
                  cls={product.canonical.recallStatus === "active" ? "text-red-600" : "text-emerald-600"}
                />
              )}
            </div>
            {product.canonical.recallStatus === "active" && product.canonical.recallSourceUrl && (
              <a
                href={product.canonical.recallSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                리콜 상세 확인
              </a>
            )}
          </section>
        )}

        {/* 구매 링크 */}
        {offersEnabled && (
          <section className="bg-white mt-2 px-5 py-5">
            <p className="text-xs font-medium text-gray-400 mb-3">구매 링크</p>
            {offers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {offers.slice(0, 5).map((offer, i) => (
                  <a
                    key={i}
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 hover:bg-orange-50 transition-colors"
                  >
                    {offer.imageUrl && (
                      <img
                        src={offer.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-white border border-gray-100 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{offer.title}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{offer.mall}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-orange-600">
                        {offer.price.toLocaleString()}원
                      </p>
                      <p className="text-[10px] text-gray-400">{offer.source === "naver" ? "네이버" : "쿠팡"}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-300 text-center py-4">검색 결과가 없어요</p>
            )}
          </section>
        )}
      </div>

      {/* 하단 고정 CTA */}
      <div className="absolute bottom-[64px] left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-5 py-3 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => {
            if (isSelected) {
              toggleProduct(product)
            } else {
              if (product.base_unit === "ml" || product.base_unit === "장") {
                setProductVolume(product, product.daily_serving_count ?? (product.base_unit === "장" ? 2 : 400))
              } else {
                toggleProduct(product)
              }
            }
          }}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-colors ${
            isSelected
              ? "bg-gray-200 text-gray-600 shadow-gray-200/30 hover:bg-gray-300"
              : "bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-600"
          }`}
        >
          {isSelected ? "설계에서 제거" : "내 설계에 추가"}
        </button>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function TrustCell({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <p className="text-[11px] text-gray-400 font-medium mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${cls ?? "text-gray-800"}`}>{value}</p>
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <p className="text-[11px] text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
  )
}

function NutrientRow({
  name, amount, unit, daily, riPct, isExceeded, isDeficient,
}: {
  name: string; amount: number; unit: string; daily: number
  riPct: number | null; isExceeded: boolean; isDeficient: boolean
}) {
  return (
    <div className="flex items-center py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm font-bold text-gray-700 flex-1">{name}</span>
      <span className="text-sm text-gray-500 tabular-nums w-24 text-right">
        {amount}{unit}
      </span>
      <span className="text-xs text-gray-400 tabular-nums w-20 text-right">
        일 {daily}{unit}
      </span>
      <span className={`text-xs font-bold w-16 text-right tabular-nums ${
        isExceeded ? "text-red-500" : isDeficient ? "text-amber-500" : riPct !== null ? "text-emerald-500" : "text-gray-300"
      }`}>
        {riPct !== null ? `${riPct}%` : "—"}
      </span>
    </div>
  )
}
