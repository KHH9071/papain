"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import { getAgeGroup } from "@/lib/kdri_data"
import { PERIOD_CONFIG, getNutrientGaps } from "@/lib/nutrition_utils"
import type { Product, ProductCategory } from "@/lib/types"
import { ROUTINE_PRODUCTS, CATEGORY_ICON, CATEGORY_LABEL } from "@/lib/routine_foods"
import {
  getComparisonCapability,
  isRoutineProduct,
} from "@/lib/comparison"
import {
  deriveProductMetadata,
  deriveSupplementSubtype,
} from "@/lib/metadata_seed"

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const RECOMMENDED_NUTRIENTS = [
  "칼슘", "철", "아연", "비타민D", "비타민C", "비타민A", "오메가3", "프로바이오틱스",
]
const PRODUCT_COLORS = [
  "#fb923c", "#fb7185", "#2dd4bf", "#34d399",
  "#fbbf24", "#38bdf8", "#a78bfa", "#818cf8",
]

type CategoryFilter = "all" | "supplement" | "formula" | "milk" | "cheese"

// ─── 유사 제품 알고리즘 ────────────────────────────────────────────────────────
function getSimilarProducts(
  current: Product,
  allProducts: Product[],
  maxCount = 5,
  minOverlap = 1,
): { product: Product; overlap: number }[] {
  const currentNames = new Set(current.nutrients.map((n) => n.name))
  return allProducts
    .filter((p) => p.id !== current.id && p.category === current.category)
    .map((p) => ({
      product: p,
      overlap: p.nutrients.filter((n) => currentNames.has(n.name)).length,
    }))
    .filter(({ overlap }) => overlap >= minOverlap)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, maxCount)
}

// ─── 용량 입력 모달 (기존 유지) ───────────────────────────────────────────────
function VolumeModal({
  product,
  currentVolume,
  onConfirm,
  onCancel,
}: {
  product: Product
  currentVolume: number | null
  onConfirm: (volume: number) => void
  onCancel: () => void
}) {
  const isML      = product.base_unit === "ml"
  const step      = isML ? 50 : 1
  const minVal    = isML ? 50 : 1
  const unitLabel = isML ? "ml" : "장"
  const [value, setValue] = useState(
    currentVolume ?? product.daily_serving_count ?? (isML ? 400 : 2)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">
            {CATEGORY_ICON[product.category as "formula" | "milk" | "cheese"] ?? "🍼"}
          </span>
          <div>
            <p className="text-[11px] font-bold text-gray-400">{product.manufacturer}</p>
            <p className="font-extrabold text-gray-800">{product.product_name}</p>
          </div>
        </div>
        <p className="text-sm font-bold text-gray-600 mb-3">
          하루 섭취량을 입력해 주세요 ({unitLabel})
        </p>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setValue((v) => Math.max(minVal, v - step))}
            className="w-11 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xl flex items-center justify-center active:bg-gray-200"
          >−</button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-extrabold text-gray-800">{value}</span>
            <span className="text-sm font-bold text-gray-500 ml-1">{unitLabel}</span>
          </div>
          <button
            onClick={() => setValue((v) => v + step)}
            className="w-11 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xl flex items-center justify-center active:bg-gray-200"
          >+</button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 font-extrabold text-sm"
          >취소</button>
          <button
            onClick={() => onConfirm(value)}
            className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-extrabold text-sm shadow-md shadow-blue-500/30 active:bg-blue-600"
          >등록하기</button>
        </div>
      </div>
    </div>
  )
}

// ─── 제품 카드 ────────────────────────────────────────────────────────────────
function MobileProductCard({
  product, selected, onToggle, onRoutineTap, expanded, onToggleExpand,
  color, allProducts, onSetAsReference, onStageFilter,
}: {
  product: Product
  selected: boolean
  onToggle: () => void
  onRoutineTap: () => void
  expanded: boolean
  onToggleExpand: () => void
  color: string | undefined
  allProducts: Product[]
  onSetAsReference: (product: Product) => void
  onStageFilter: (stage: number) => void
}) {
  const isRoutine        = isRoutineProduct(product)
  const capability       = getComparisonCapability(product)
  const canCompare       = capability.activeAxes.includes("nutrient-overlap")
  const formulaStage     = product.metadata?.formulaStage
  const canFilterByStage = capability.activeAxes.includes("stage") && !!formulaStage
  const hasNutrients     = product.nutrients.length > 0

  const similarList = useMemo(
    () => (expanded && canCompare ? getSimilarProducts(product, allProducts, 3) : []),
    [expanded, canCompare, product, allProducts]
  )

  const handleMainTap = () => {
    if (isRoutine) onRoutineTap()
    else onToggle()
  }

  // formula: "분유 · X단계" 배지, milk/cheese: 카테고리 레이블
  const displayLabel = isRoutine
    ? product.category === "formula" && formulaStage
      ? `분유 · ${formulaStage}단계`
      : (product.category ? CATEGORY_LABEL[product.category as "formula" | "milk" | "cheese"] : "")
    : null

  return (
    <div
      className={`bg-white rounded-2xl border-2 transition-all cursor-pointer flex flex-col relative overflow-hidden ${
        selected
          ? isRoutine
            ? "border-blue-400 shadow-md shadow-blue-400/10"
            : "border-orange-500 shadow-md shadow-orange-500/10"
          : "border-gray-100"
      }`}
    >
      <div className="p-4 flex gap-3 items-start relative" onClick={handleMainTap}>
        {/* 선택 인디케이터 */}
        <div
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected
              ? isRoutine
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-orange-500 border-orange-500 text-white"
              : "border-gray-300 text-transparent"
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {selected && color && !isRoutine && (
          <div className="absolute left-[52px] top-[18px] w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        )}

        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isRoutine && (
              <span className="text-base">{CATEGORY_ICON[product.category as "formula" | "milk" | "cheese"]}</span>
            )}
            <p className="text-[10px] font-bold text-gray-400">{product.manufacturer ?? ""}</p>
            {displayLabel && (
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{displayLabel}</span>
            )}
          </div>
          <h3 className={`font-extrabold text-[15px] leading-tight ${
            selected ? (isRoutine ? "text-blue-600" : "text-orange-600") : "text-gray-800"
          }`}>
            {product.product_name}
          </h3>

          {/* 영양소 태그 — 영양소가 있는 경우만 */}
          {hasNutrients ? (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {product.nutrients.slice(0, 5).map((n, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                    selected
                      ? isRoutine
                        ? "bg-blue-50 text-blue-600"
                        : "bg-orange-50 text-orange-600"
                      : "bg-gray-50 text-gray-500 border border-gray-100"
                  }`}
                >
                  {n.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {product.metadata?.isOrganic && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-green-50 text-green-600 border border-green-100">
                  유기농
                </span>
              )}
              {product.metadata?.baseAnimalType === "goat" && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-600 border border-amber-100">
                  산양
                </span>
              )}
              {product.functionality && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-violet-50 text-violet-500 border border-violet-100">
                  {product.functionality}
                </span>
              )}
            </div>
          )}

          {selected && isRoutine && product.daily_serving_count && (
            <p className="text-[10px] font-bold text-blue-500 mt-1.5">
              하루 {product.daily_serving_count}{product.base_unit === "ml" ? "ml" : "장"}
              <span className="text-gray-400 ml-1">· 탭해서 수량 변경</span>
            </p>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-50 text-gray-400"
        >
          <svg
            width={18} height={18}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 아코디언 상세 */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-2 bg-gray-50/50 border-t border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {product.functionality && hasNutrients && (
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-3">
              {product.functionality}
            </p>
          )}
          {product.precautions && (
            <p className="text-xs text-rose-500/80 font-medium leading-relaxed mb-3">
              {product.precautions}
            </p>
          )}

          {/* 영양성분표 — 영양소가 있는 제품 */}
          {hasNutrients ? (
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2 mb-3">
              {isRoutine && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400">기준 단위</span>
                  <span className="text-xs font-extrabold text-gray-700">
                    per 100{product.base_unit === "ml" ? "ml" : "장"}
                  </span>
                </div>
              )}
              {product.metadata?.derivedAgeRangeMonths && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400">단계 기준 예상 월령</span>
                  <span className="text-xs font-bold text-gray-500">
                    {product.metadata.derivedAgeRangeMonths[0]}~{product.metadata.derivedAgeRangeMonths[1]}개월
                  </span>
                </div>
              )}
              {product.nutrients.map((n, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-500">{n.name}</span>
                  <span className="text-xs font-bold text-gray-800">{n.amount}{n.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            /* 영양소 미제공 제품 — 제품 정보 표시 */
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2 mb-3">
              {product.metadata?.derivedAgeRangeMonths && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400">예상 월령</span>
                  <span className="text-xs font-bold text-gray-500">
                    {product.metadata.derivedAgeRangeMonths[0]}~{product.metadata.derivedAgeRangeMonths[1]}개월
                  </span>
                </div>
              )}
              {product.metadata?.baseAnimalType && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400">원유 기반</span>
                  <span className="text-xs font-bold text-gray-800">
                    {product.metadata.baseAnimalType === "cow" ? "소" : "산양"}유
                  </span>
                </div>
              )}
              {product.metadata?.isOrganic && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400">인증</span>
                  <span className="text-xs font-bold text-green-600">유기농</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[10px] font-bold text-gray-400">
                  영양성분 정보는 추후 업데이트 예정이에요
                </p>
              </div>
            </div>
          )}

          {/* 탐색 진입 버튼 */}
          {canCompare ? (
            <button
              onClick={() => onSetAsReference(product)}
              className="w-full flex items-center justify-between bg-gray-100 hover:bg-orange-50 hover:border-orange-200 border border-transparent rounded-xl px-3 py-2.5 mb-3 transition-colors group"
            >
              <span className="text-[11px] font-extrabold text-gray-500 group-hover:text-orange-600">
                이 제품 기준으로 비슷한 제품 살펴보기
              </span>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-orange-500">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : canFilterByStage ? (
            <button
              onClick={() => onStageFilter(formulaStage!)}
              className="w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-3 py-2.5 mb-3 transition-colors group"
            >
              <span className="text-[11px] font-extrabold text-blue-500">
                {formulaStage}단계 분유만 보기
              </span>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : capability.unavailableReason ? (
            <div className="flex items-start gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-3">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-px">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[10px] font-bold text-gray-400 leading-snug">
                {capability.unavailableReason}
              </p>
            </div>
          ) : null}

          {/* 유사 성분 제품 미리보기 */}
          {similarList.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-gray-400 mb-2">
                성분 기준 비슷한 제품 미리보기
              </p>
              <div className="flex flex-col gap-1.5">
                {similarList.map(({ product: sim, overlap }) => (
                  <button
                    key={sim.id}
                    onClick={() => onSetAsReference(sim)}
                    className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 px-3 py-2 transition-colors text-left w-full group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 truncate">{sim.manufacturer}</p>
                      <p className="text-xs font-extrabold text-gray-700 group-hover:text-orange-700 truncate">{sim.product_name}</p>
                      <p className="text-[9px] font-bold text-emerald-500 mt-0.5">성분 {overlap}개 일치</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex flex-wrap gap-0.5 justify-end max-w-[90px]">
                        {sim.nutrients.slice(0, 3).map((n, i) => (
                          <span key={i} className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1 py-0.5 rounded">
                            {n.name}
                          </span>
                        ))}
                      </div>
                      <span className="text-[9px] font-bold text-orange-400 group-hover:text-orange-600">
                        기준으로 설정 →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 컨텍스트 배너 (축약형) ──────────────────────────────────────────────────
function SearchContextBanner({
  monthsOld,
  selectedProducts,
  onNutrientClick,
}: {
  monthsOld: number
  selectedProducts: Product[]
  onNutrientClick: (name: string) => void
}) {
  const ageGroup = getAgeGroup(monthsOld)
  const config   = PERIOD_CONFIG[ageGroup]
  const gaps     = useMemo(
    () => getNutrientGaps(selectedProducts, monthsOld),
    [selectedProducts, monthsOld]
  )
  const hasProducts = selectedProducts.length > 0
  const focusChips  =
    hasProducts && gaps.underNames.length > 0
      ? gaps.underNames.slice(0, 4)
      : config.focus.slice(0, 4)

  return (
    <div className="flex items-center gap-2 px-5 py-2.5 bg-white border-b border-gray-100 overflow-x-auto scrollbar-hide">
      <span className="text-[10px] font-extrabold text-gray-500 shrink-0 whitespace-nowrap">
        {monthsOld}개월 · {config.period}
      </span>
      <span className="text-gray-300 shrink-0 text-[10px]">|</span>
      {focusChips.map((name) => (
        <button
          key={name}
          onClick={() => onNutrientClick(name)}
          className="text-[10px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 hover:bg-orange-100 transition-colors"
        >
          {name}
        </button>
      ))}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
function resolveInitialCategory(category: string | undefined): CategoryFilter {
  if (!category) return "all"
  if (category === "supplement") return "supplement"
  if (category === "formula") return "formula"
  if (category === "milk") return "milk"
  if (category === "cheese") return "cheese"
  if (category === "routine") return "formula"
  return "all"
}

export default function SearchClient({
  initialProducts,
  canonicalFormulaProducts,
  initialNutrient,
  initialCategory,
}: {
  initialProducts: Product[]
  canonicalFormulaProducts?: Product[]
  initialNutrient?: string
  initialCategory?: string
}) {
  const { selectedProducts, monthsOld, toggleProduct, setProductVolume } = useAppStore()

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(() => resolveInitialCategory(initialCategory))
  const [searchQuery, setSearchQuery]       = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeNutrient, setActiveNutrient] = useState<string | null>(null)
  const [dbProducts, setDbProducts]         = useState<Product[]>(initialProducts)
  const [isSearching, setIsSearching]       = useState(false)
  const [expandedIds, setExpandedIds]       = useState<Set<number>>(new Set())
  const [volumeModal, setVolumeModal]       = useState<Product | null>(null)
  const [referenceProduct, setReferenceProduct] = useState<Product | null>(null)
  const [stageFilter, setStageFilter]           = useState<number | null>(null)
  const [originFilter, setOriginFilter]         = useState<"all" | "domestic" | "overseas">("all")
  const [milkTargetFilter, setMilkTargetFilter] = useState<"all" | "toddler" | "general">("all")

  const colorMap = new Map(
    selectedProducts
      .filter((p) => !isRoutineProduct(p))
      .map((p, i) => [p.id, PRODUCT_COLORS[i % PRODUCT_COLORS.length]])
  )

  // ── ROUTINE_PRODUCTS(우유·치즈) + canonical 분유 병합 ────────────────────
  const allRoutineProducts = useMemo(() => {
    const canonical = canonicalFormulaProducts ?? []
    return [...canonical, ...ROUTINE_PRODUCTS]
  }, [canonicalFormulaProducts])

  // ── 디바운스 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCategoryFilter(resolveInitialCategory(initialCategory))
  }, [initialCategory])

  useEffect(() => {
    if (initialNutrient) {
      setActiveNutrient(initialNutrient)
      setReferenceProduct(null)
    }
  }, [initialNutrient])

  useEffect(() => {
    if (searchQuery) setReferenceProduct(null)
  }, [searchQuery])

  // ── 검색 (Supabase) ──────────────────────────────────────────────────────
  useEffect(() => {
    const term = debouncedQuery.trim()
    if (!term) {
      setDbProducts(initialProducts)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    supabase
      .from("products")
      .select("*")
      .or(`product_name.ilike.%${term}%,manufacturer.ilike.%${term}%`)
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setDbProducts(data as Product[])
        setIsSearching(false)
      })
  }, [debouncedQuery, initialProducts])

  // ── 전체 제품 풀 (유사 제품 계산용) ─────────────────────────────────────
  const allProductsPool = useMemo(() => {
    const supplements = dbProducts.map((p) => {
      const withCategory = { ...p, category: p.category ?? ("supplement" as ProductCategory) }
      return {
        ...withCategory,
        subtype: withCategory.subtype ?? deriveSupplementSubtype(withCategory),
        metadata: deriveProductMetadata(withCategory),
      }
    })
    return [...supplements, ...allRoutineProducts]
  }, [dbProducts, allRoutineProducts])

  // ── 표시할 제품 목록 ──────────────────────────────────────────────────────
  const displayedProducts = useMemo(() => {
    if (referenceProduct) {
      return getSimilarProducts(referenceProduct, allProductsPool, 5).map(({ product }) => product)
    }

    const term = debouncedQuery.trim().toLowerCase()
    const supplements = dbProducts.map((p) => ({
      ...p,
      category: p.category ?? ("supplement" as ProductCategory),
    }))
    const routines = term
      ? allRoutineProducts.filter((p) =>
          p.product_name.toLowerCase().includes(term) ||
          (p.manufacturer ?? "").toLowerCase().includes(term)
        )
      : allRoutineProducts

    let combined: Product[]
    switch (categoryFilter) {
      case "all":
        combined = [...supplements, ...routines]
        break
      case "supplement":
        combined = supplements
        break
      case "formula":
        combined = routines.filter(p => p.category === "formula")
        break
      case "milk":
        combined = routines.filter(p => p.category === "milk")
        break
      case "cheese":
        combined = routines.filter(p => p.category === "cheese")
        break
      default:
        combined = [...supplements, ...routines]
    }

    if (activeNutrient) {
      combined = combined.filter((p) => p.nutrients.some((n) => n.name === activeNutrient))
    }

    // 단계 필터: formula 제품만 해당 단계로 좁힘
    if (stageFilter !== null) {
      combined = combined.filter(
        (p) => p.category !== "formula" || p.metadata?.formulaStage === stageFilter,
      )
    }

    // 국내/해외 필터: formula 제품만 적용
    if (originFilter !== "all") {
      combined = combined.filter((p) => {
        if (p.category !== "formula") return true
        const isDomestic = (p.manufacturer ?? "").includes("한국")
        return originFilter === "domestic" ? isDomestic : !isDomestic
      })
    }

    // 우유 대상 필터: milk 제품만 적용
    if (milkTargetFilter !== "all") {
      combined = combined.filter((p) => {
        if (p.category !== "milk") return true
        return p.metadata?.milkTarget === milkTargetFilter
      })
    }

    return combined
  }, [referenceProduct, dbProducts, debouncedQuery, categoryFilter, activeNutrient, stageFilter, originFilter, milkTargetFilter, allProductsPool, allRoutineProducts])

  // ── formula 단계별 제품 수 ────────────────────────────────────────────────
  const stageProductCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const p of allProductsPool) {
      if (p.category === "formula" && p.metadata?.formulaStage) {
        const s = p.metadata.formulaStage
        counts[s] = (counts[s] ?? 0) + 1
      }
    }
    return counts
  }, [allProductsPool])

  // ── milk 대상별 제품 수 ──────────────────────────────────────────────────
  const milkTargetCounts = useMemo(() => {
    const counts = { toddler: 0, general: 0 }
    for (const p of allProductsPool) {
      if (p.category === "milk" && p.metadata?.milkTarget) {
        counts[p.metadata.milkTarget]++
      }
    }
    return counts
  }, [allProductsPool])

  // ── 영양소 필터 순서 ──────────────────────────────────────────────────────
  const gaps = useMemo(
    () => getNutrientGaps(selectedProducts, monthsOld),
    [selectedProducts, monthsOld]
  )
  const orderedNutrients = useMemo(() => {
    if (!gaps.underNames.length) return RECOMMENDED_NUTRIENTS
    const underSet = new Set(gaps.underNames)
    return [
      ...RECOMMENDED_NUTRIENTS.filter((n) => underSet.has(n)),
      ...RECOMMENDED_NUTRIENTS.filter((n) => !underSet.has(n)),
    ]
  }, [gaps.underNames])

  // ── 이벤트 핸들러 ────────────────────────────────────────────────────────
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isSelected = (id: number) => selectedProducts.some((p) => p.id === id)

  const handleRoutineTap = (product: Product) => {
    const current = selectedProducts.find((p) => p.id === product.id)
    setVolumeModal(current ?? product)
  }

  const handleVolumeConfirm = (volume: number) => {
    if (!volumeModal) return
    setProductVolume(volumeModal, volume)
    setVolumeModal(null)
  }

  const handleNutrientClick = (name: string) => {
    setReferenceProduct(null)
    setActiveNutrient((prev) => (prev === name ? null : name))
  }

  const handleReferenceClick = (product: Product) => {
    setActiveNutrient(null)
    setSearchQuery("")
    setStageFilter(null)
    setReferenceProduct(product)
  }

  const handleStageFilter = (stage: number) => {
    setReferenceProduct(null)
    if (categoryFilter !== "formula") setCategoryFilter("formula")
    setStageFilter((prev) => (prev === stage ? null : stage))
  }

  const formulaSelectedCount = selectedProducts.filter(p => p.category === "formula").length
  const milkSelectedCount    = selectedProducts.filter(p => p.category === "milk").length
  const cheeseSelectedCount  = selectedProducts.filter(p => p.category === "cheese").length

  const CATEGORY_TABS: { key: CategoryFilter; label: string; activeClass: string }[] = [
    { key: "all",        label: "전체",     activeClass: "bg-gray-800 text-white" },
    { key: "supplement", label: "💊 건기식", activeClass: "bg-gray-800 text-white" },
    { key: "formula",    label: `🍼 분유${formulaSelectedCount > 0 ? ` (${formulaSelectedCount})` : ""}`,  activeClass: "bg-blue-500 text-white" },
    { key: "milk",       label: `🥛 우유${milkSelectedCount > 0 ? ` (${milkSelectedCount})` : ""}`,        activeClass: "bg-blue-500 text-white" },
    { key: "cheese",     label: `🧀 치즈${cheeseSelectedCount > 0 ? ` (${cheeseSelectedCount})` : ""}`,    activeClass: "bg-blue-500 text-white" },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── 스티키 헤더 ── */}
      <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur-sm px-5 pt-4 pb-3 border-b border-gray-100/50">

        {/* 검색 입력 */}
        <div className="relative group mb-3">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
            {isSearching ? (
              <svg className="w-[18px] h-[18px] animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.1" y2="16.1" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제품명 또는 브랜드 검색"
            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-orange-400 shadow-sm text-sm font-medium text-gray-700 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 카테고리 탭 — 항상 표시 */}
        {!referenceProduct ? (
          <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
            {CATEGORY_TABS.map(({ key, label, activeClass }) => (
              <button
                key={key}
                onClick={() => {
                  setCategoryFilter(key)
                  if (key !== "formula") { setStageFilter(null); setOriginFilter("all") }
                  if (key !== "milk") { setMilkTargetFilter("all") }
                }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                  categoryFilter === key
                    ? activeClass
                    : "bg-white border border-gray-200 text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-orange-500 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
              비슷한 제품 탐색 중
            </span>
            <button
              onClick={() => setReferenceProduct(null)}
              className="ml-auto text-[11px] font-bold text-gray-400 hover:text-gray-600"
            >
              전체 목록으로
            </button>
          </div>
        )}

        {/* 분유 하위 필터: 단계 + 국내/해외 — formula 탭에서만 */}
        {!referenceProduct && !debouncedQuery && categoryFilter === "formula" && (
          <div className="flex flex-col gap-2 mb-2">
            {/* 단계 필터 */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <span className="text-[10px] font-bold text-gray-400 shrink-0">단계</span>
              {[0, 1, 2, 3].map((stage) => {
                const count = stageProductCounts[stage] ?? 0
                const label = stage === 0 ? "PRE" : `${stage}단계`
                return (
                  <button
                    key={stage}
                    onClick={() => handleStageFilter(stage)}
                    className={`px-2.5 py-1 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                      stageFilter === stage
                        ? "bg-blue-500 text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500"
                    }`}
                  >
                    {label}{count > 0 ? `(${count})` : ""}
                  </button>
                )
              })}
              {stageFilter !== null && (
                <button
                  onClick={() => setStageFilter(null)}
                  className="text-[11px] font-bold text-gray-400 hover:text-gray-600 shrink-0"
                >
                  전체
                </button>
              )}
            </div>
            {/* 국내/해외 필터 */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <span className="text-[10px] font-bold text-gray-400 shrink-0">원산지</span>
              {([
                { key: "all",      label: "전체" },
                { key: "domestic", label: "🇰🇷 국내" },
                { key: "overseas", label: "🌍 해외" },
              ] as { key: "all" | "domestic" | "overseas"; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setOriginFilter(key)}
                  className={`px-2.5 py-1 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                    originFilter === key
                      ? "bg-blue-500 text-white"
                      : "bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 우유 하위 필터: 유아용/일반 — milk 탭에서만 */}
        {!referenceProduct && !debouncedQuery && categoryFilter === "milk" && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide mb-2">
            <span className="text-[10px] font-bold text-gray-400 shrink-0">대상</span>
            {([
              { key: "all",      label: "전체" },
              { key: "toddler",  label: `👶 유아용(${milkTargetCounts.toddler})` },
              { key: "general",  label: `🥛 일반(${milkTargetCounts.general})` },
            ] as { key: "all" | "toddler" | "general"; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMilkTargetFilter(key)}
                className={`px-2.5 py-1 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                  milkTargetFilter === key
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 영양소 필터 — 건기식 탭일 때만 */}
        {!referenceProduct && categoryFilter === "supplement" && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveNutrient(null)}
              className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                activeNutrient === null ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-500"
              }`}
            >
              전체보기
            </button>
            {orderedNutrients.map((nutrient) => {
              const isUnder = gaps.underNames.includes(nutrient)
              return (
                <button
                  key={nutrient}
                  onClick={() => handleNutrientClick(nutrient)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                    activeNutrient === nutrient
                      ? "bg-gray-800 text-white"
                      : isUnder
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-white border border-gray-200 text-gray-500"
                  }`}
                >
                  {nutrient}
                  {isUnder && activeNutrient !== nutrient && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 스크롤 영역 ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* 축약 컨텍스트 바 */}
        {!debouncedQuery && !referenceProduct && (
          <SearchContextBanner
            monthsOld={monthsOld}
            selectedProducts={selectedProducts}
            onNutrientClick={handleNutrientClick}
          />
        )}

        {/* 홈 진입 맥락 인디케이터 */}
        {!debouncedQuery && initialNutrient && activeNutrient === initialNutrient && (
          <div className="mx-5 mt-2 flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-bold text-gray-400">
              홈에서 이어서 살펴보는 중 ·{" "}
              <span className="text-orange-500">{initialNutrient}</span>
            </span>
            <button
              onClick={() => setActiveNutrient(null)}
              className="text-[10px] font-bold text-gray-400 hover:text-gray-600"
            >
              전체 보기
            </button>
          </div>
        )}

        {/* 활성 필터 칩 */}
        {activeNutrient && (
          <div className="flex items-center gap-2 px-5 py-2 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] font-bold text-gray-400 shrink-0">필터</span>
            <button
              onClick={() => setActiveNutrient(null)}
              className="flex items-center gap-1 text-[10px] font-extrabold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors shrink-0"
            >
              {activeNutrient}
              <svg width={8} height={8} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-5 pb-4 pt-3 flex flex-col gap-3">
          {/* 모드별 결과 헤더 */}
          {referenceProduct && displayedProducts.length > 0 && (
            <p className="text-[11px] font-bold text-gray-400 text-center py-1">
              성분 기준 비슷한 제품 {displayedProducts.length}개 · 탭해서 기준 제품으로 전환할 수 있어요
            </p>
          )}
          {stageFilter !== null && !referenceProduct && displayedProducts.length > 0 && (
            <p className="text-[11px] font-bold text-blue-400 text-center py-1">
              {stageFilter === 0 ? "PRE" : stageFilter}단계 분유 {displayedProducts.filter((p) => p.category === "formula").length}개
            </p>
          )}
          {milkTargetFilter !== "all" && !referenceProduct && displayedProducts.length > 0 && (
            <p className="text-[11px] font-bold text-blue-400 text-center py-1">
              {milkTargetFilter === "toddler" ? "유아용" : "일반"} 우유 {displayedProducts.filter((p) => p.category === "milk").length}개
            </p>
          )}

          {displayedProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm font-bold">
              {referenceProduct
                ? (() => {
                    const cap = getComparisonCapability(referenceProduct)
                    return !cap.activeAxes.includes("nutrient-overlap")
                      ? cap.unavailableReason ?? "현재 이 카테고리는 성분 기준 비교를 지원하지 않아요"
                      : "공통 성분이 있는 다른 제품을 찾지 못했어요"
                  })()
                : stageFilter !== null
                ? `${stageFilter === 0 ? "PRE" : stageFilter}단계 분유 제품이 없어요`
                : activeNutrient
                ? `"${activeNutrient}" 성분이 포함된 제품이 없습니다`
                : searchQuery
                ? `"${searchQuery}"에 해당하는 제품이 없습니다`
                : "제품이 없습니다"}
              <button
                className="block mx-auto mt-3 text-xs text-orange-500 font-bold underline underline-offset-2"
                onClick={() => {
                  setSearchQuery("")
                  setActiveNutrient(null)
                  setCategoryFilter("all")
                  setReferenceProduct(null)
                  setStageFilter(null)
                }}
              >
                전체 제품 보기
              </button>
            </div>
          ) : (
            displayedProducts.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                selected={isSelected(product.id)}
                onToggle={() => toggleProduct(product)}
                onRoutineTap={() => handleRoutineTap(product)}
                expanded={expandedIds.has(product.id)}
                onToggleExpand={() => toggleExpand(product.id)}
                color={colorMap.get(product.id)}
                allProducts={allProductsPool}
                onSetAsReference={handleReferenceClick}
                onStageFilter={handleStageFilter}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 용량 입력 모달 ── */}
      {volumeModal && (
        <VolumeModal
          product={volumeModal}
          currentVolume={selectedProducts.find((p) => p.id === volumeModal.id)?.daily_serving_count ?? null}
          onConfirm={handleVolumeConfirm}
          onCancel={() => setVolumeModal(null)}
        />
      )}
    </div>
  )
}
