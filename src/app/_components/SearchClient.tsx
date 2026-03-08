"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import { getAgeGroup } from "@/lib/kdri_data"
import { PERIOD_CONFIG, getNutrientGaps } from "@/lib/nutrition_utils"
import type { Product, ProductCategory } from "@/lib/types"
import { ROUTINE_PRODUCTS, CATEGORY_ICON, CATEGORY_LABEL } from "@/lib/routine_foods"

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const RECOMMENDED_NUTRIENTS = [
  "칼슘", "철", "아연", "비타민D", "비타민C", "비타민A", "오메가3", "프로바이오틱스",
]
const PRODUCT_COLORS = [
  "#fb923c", "#fb7185", "#2dd4bf", "#34d399",
  "#fbbf24", "#38bdf8", "#a78bfa", "#818cf8",
]
const ROUTINE_CATEGORIES = new Set<ProductCategory>(["formula", "milk", "cheese"])

type CategoryFilter = "all" | "supplement" | "routine"

// ─── 유사 제품 알고리즘 (기존 유지) ──────────────────────────────────────────
function getSimilarProducts(current: Product, allProducts: Product[]): Product[] {
  const currentNames = new Set(current.nutrients.map((n) => n.name))
  return allProducts
    .filter((p) => p.id !== current.id && p.category === current.category)
    .map((p) => ({
      product: p,
      overlap: p.nutrients.filter((n) => currentNames.has(n.name)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map(({ product }) => product)
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
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">
            {CATEGORY_ICON[product.category as "formula" | "milk" | "cheese"] ?? "🍼"}
          </span>
          <div>
            <p className="text-[11px] font-bold text-stone-400">{product.manufacturer}</p>
            <p className="font-extrabold text-stone-800">{product.product_name}</p>
          </div>
        </div>
        <p className="text-sm font-bold text-stone-600 mb-3">
          하루 섭취량을 입력해 주세요 ({unitLabel})
        </p>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setValue((v) => Math.max(minVal, v - step))}
            className="w-11 h-11 rounded-xl bg-stone-100 text-stone-700 font-bold text-xl flex items-center justify-center active:bg-stone-200"
          >−</button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-extrabold text-stone-800">{value}</span>
            <span className="text-sm font-bold text-stone-500 ml-1">{unitLabel}</span>
          </div>
          <button
            onClick={() => setValue((v) => v + step)}
            className="w-11 h-11 rounded-xl bg-stone-100 text-stone-700 font-bold text-xl flex items-center justify-center active:bg-stone-200"
          >+</button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-500 font-extrabold text-sm"
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

// ─── 제품 카드 (기존 유지) ────────────────────────────────────────────────────
function MobileProductCard({
  product, selected, onToggle, onRoutineTap, expanded, onToggleExpand, color, allProducts,
}: {
  product: Product
  selected: boolean
  onToggle: () => void
  onRoutineTap: () => void
  expanded: boolean
  onToggleExpand: () => void
  color: string | undefined
  allProducts: Product[]
}) {
  const isRoutine   = ROUTINE_CATEGORIES.has(product.category ?? ("" as ProductCategory))
  const similarList = useMemo(
    () => (expanded ? getSimilarProducts(product, allProducts) : []),
    [expanded, product, allProducts]
  )

  const handleMainTap = () => {
    if (isRoutine) onRoutineTap()
    else onToggle()
  }

  const displayLabel = isRoutine
    ? (product.category ? CATEGORY_LABEL[product.category as "formula" | "milk" | "cheese"] : "")
    : null

  return (
    <div
      className={`bg-white rounded-2xl border-2 transition-all cursor-pointer flex flex-col relative overflow-hidden ${
        selected
          ? isRoutine
            ? "border-blue-400 shadow-md shadow-blue-400/10"
            : "border-orange-500 shadow-md shadow-orange-500/10"
          : "border-stone-100"
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
              : "border-stone-300 text-transparent"
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
            <p className="text-[10px] font-bold text-stone-400">{product.manufacturer ?? ""}</p>
            {displayLabel && (
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{displayLabel}</span>
            )}
          </div>
          <h3 className={`font-extrabold text-[15px] leading-tight ${
            selected ? (isRoutine ? "text-blue-600" : "text-orange-600") : "text-stone-800"
          }`}>
            {product.product_name}
          </h3>

          {/* 영양소 태그 */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {product.nutrients.slice(0, 5).map((n, i) => (
              <span
                key={i}
                className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                  selected
                    ? isRoutine
                      ? "bg-blue-50 text-blue-600"
                      : "bg-orange-50 text-orange-600"
                    : "bg-stone-50 text-stone-500 border border-stone-100"
                }`}
              >
                {n.name}
              </span>
            ))}
          </div>

          {selected && isRoutine && product.daily_serving_count && (
            <p className="text-[10px] font-bold text-blue-500 mt-1.5">
              하루 {product.daily_serving_count}{product.base_unit === "ml" ? "ml" : "장"}
              <span className="text-stone-400 ml-1">· 탭해서 수량 변경</span>
            </p>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-stone-50 text-stone-400"
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
          className="px-4 pb-4 pt-2 bg-stone-50/50 border-t border-stone-100"
          onClick={(e) => e.stopPropagation()}
        >
          {product.functionality && (
            <p className="text-xs text-stone-500 font-medium leading-relaxed mb-3">
              {product.functionality}
            </p>
          )}
          {product.precautions && (
            <p className="text-xs text-rose-500/80 font-medium leading-relaxed mb-3">
              ⚠ {product.precautions}
            </p>
          )}

          {/* 영양성분표 */}
          <div className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-2 mb-3">
            {isRoutine && (
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <span className="text-[11px] font-bold text-stone-400">기준 단위</span>
                <span className="text-xs font-extrabold text-stone-700">
                  per 100{product.base_unit === "ml" ? "ml" : "장"}
                </span>
              </div>
            )}
            {product.nutrients.map((n, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-stone-500">{n.name}</span>
                <span className="text-xs font-bold text-stone-800">{n.amount}{n.unit}</span>
              </div>
            ))}
          </div>

          {/* 유사 성분 제품 (아코디언 내부 — 상단 배너에서도 진입 가능) */}
          {similarList.length > 0 && (
            <div className="mt-1">
              <p className="text-[10px] font-extrabold text-stone-400 mb-2 flex items-center gap-1">
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                비슷한 성분의 다른 제품 보기
              </p>
              <div className="flex flex-col gap-1.5">
                {similarList.map((sim) => {
                  const overlap = sim.nutrients.filter((n) =>
                    product.nutrients.some((pn) => pn.name === n.name)
                  ).length
                  return (
                    <div
                      key={sim.id}
                      className="flex items-center gap-2 bg-white rounded-xl border border-stone-100 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-stone-400 truncate">{sim.manufacturer}</p>
                        <p className="text-xs font-extrabold text-stone-700 truncate">{sim.product_name}</p>
                        <p className="text-[9px] font-bold text-emerald-500 mt-0.5">성분 {overlap}개 일치</p>
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-[100px]">
                        {sim.nutrients.slice(0, 3).map((n, i) => (
                          <span key={i} className="text-[9px] font-bold text-stone-500 bg-stone-50 px-1 py-0.5 rounded">
                            {n.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 컨텍스트 배너 ────────────────────────────────────────────────────────────
// 탐색의 맥락(왜 지금 이걸 볼까)을 제공하는 상단 영역.
// 의료적 결론이나 처방처럼 읽히지 않도록 "탐색/살펴보기/참고" 톤을 유지합니다.
function SearchContextBanner({
  monthsOld,
  selectedProducts,
  referenceProduct,
  onNutrientClick,
  onReferenceClick,
  onClearReference,
}: {
  monthsOld: number
  selectedProducts: Product[]
  referenceProduct: Product | null
  onNutrientClick: (name: string) => void
  onReferenceClick: (product: Product) => void
  onClearReference: () => void
}) {
  const ageGroup = getAgeGroup(monthsOld)
  const config   = PERIOD_CONFIG[ageGroup]

  const hasProducts = selectedProducts.length > 0
  const gaps        = useMemo(
    () => getNutrientGaps(selectedProducts, monthsOld),
    [selectedProducts, monthsOld]
  )

  // 건기식만 대안 탐색 기준으로 활용 (루틴 식품 제외)
  const supplementsInDesign = selectedProducts.filter(
    (p) => !ROUTINE_CATEGORIES.has(p.category ?? ("" as ProductCategory))
  )

  // 포커스 칩: 아직 살펴보지 않은 영양소 → 없으면 시기별 기본 포커스
  const focusChips =
    hasProducts && gaps.underNames.length > 0 ? gaps.underNames : config.focus

  // ── 대안 탐색 모드 뷰 ────────────────────────────────────────────────────
  if (referenceProduct) {
    return (
      <div className="mx-0 mb-3 bg-orange-50/70 border border-orange-200 rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-extrabold text-orange-500">
            비슷한 성분의 다른 제품 탐색 중
          </span>
          <button
            onClick={onClearReference}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 text-orange-400 hover:bg-orange-200 transition-colors"
            aria-label="대안 탐색 종료"
          >
            <svg width={10} height={10} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-stone-400">기준 제품</span>
          <span className="text-[11px] font-extrabold text-stone-700 bg-white border border-orange-200 rounded-lg px-2 py-0.5 max-w-[200px] truncate">
            {referenceProduct.product_name}
          </span>
        </div>
        <p className="text-[11px] text-stone-400 font-medium mt-1.5">
          같은 성분이 포함된 다른 제품을 비교해보세요
        </p>
      </div>
    )
  }

  // ── 기본 컨텍스트 뷰 ─────────────────────────────────────────────────────
  return (
    <div className="mb-3 bg-orange-50/70 border border-orange-100 rounded-2xl px-4 py-3">
      {/* 헤더 */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] font-extrabold text-orange-500">
          {monthsOld}개월 · {config.period}
        </span>
        {hasProducts && (gaps.underNames.length > 0 || gaps.exceededNames.length > 0) && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
            살펴볼 것 있어요
          </span>
        )}
      </div>

      {/* 축 A: 영양소 기반 탐색 */}
      <div className={supplementsInDesign.length > 0 ? "mb-2.5" : ""}>
        <p className="text-[10px] font-bold text-stone-400 mb-1.5">
          {hasProducts && gaps.underNames.length > 0
            ? "아직 설계 전인 영양소 — 탭해서 살펴보기"
            : "이 시기 많이 살펴보는 영양소"}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {focusChips.map((name) => (
            <button
              key={name}
              onClick={() => onNutrientClick(name)}
              className="text-[10px] font-extrabold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full hover:bg-orange-200 active:bg-orange-300 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* 축 B: 대안 제품 탐색 (건기식 설계 중일 때만) */}
      {supplementsInDesign.length > 0 && (
        <div className="pt-2.5 border-t border-orange-100">
          <p className="text-[10px] font-bold text-stone-400 mb-1.5">
            현재 설계 제품의 비슷한 대안 보기
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {supplementsInDesign.map((p) => (
              <button
                key={p.id}
                onClick={() => onReferenceClick(p)}
                className="text-[10px] font-extrabold text-stone-600 bg-white border border-stone-200 px-2.5 py-1 rounded-full hover:border-orange-300 hover:text-orange-600 active:bg-orange-50 transition-colors max-w-[160px] truncate"
              >
                {p.product_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function SearchClient({
  initialProducts,
  initialNutrient,
}: {
  initialProducts: Product[]
  initialNutrient?: string
}) {
  const { selectedProducts, monthsOld, toggleProduct, setProductVolume } = useAppStore()

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [searchQuery, setSearchQuery]       = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeNutrient, setActiveNutrient] = useState<string | null>(null)
  const [dbProducts, setDbProducts]         = useState<Product[]>(initialProducts)
  const [isSearching, setIsSearching]       = useState(false)
  const [expandedIds, setExpandedIds]       = useState<Set<number>>(new Set())
  const [volumeModal, setVolumeModal]       = useState<Product | null>(null)
  // 대안 탐색 기준 제품 (Axis B)
  const [referenceProduct, setReferenceProduct] = useState<Product | null>(null)

  const colorMap = new Map(
    selectedProducts
      .filter((p) => !ROUTINE_CATEGORIES.has(p.category ?? ("" as ProductCategory)))
      .map((p, i) => [p.id, PRODUCT_COLORS[i % PRODUCT_COLORS.length]])
  )

  // ── 디바운스 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // 외부 진입(Home/Record) 맥락 — initialNutrient 변경 시 필터 동기화
  // 사용자가 "전체보기" 클릭 등으로 직접 해제할 수 있으며, 강제 고정이 아님
  useEffect(() => {
    if (initialNutrient) {
      setActiveNutrient(initialNutrient)
      setReferenceProduct(null)
    }
  }, [initialNutrient])

  // 텍스트 검색 시작 → 대안 탐색 모드 해제
  useEffect(() => {
    if (searchQuery) setReferenceProduct(null)
  }, [searchQuery])

  // ── 검색 (Supabase, 기존 유지) ────────────────────────────────────────────
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
    const supplements = dbProducts.map((p) => ({
      ...p,
      category: p.category ?? ("supplement" as ProductCategory),
    }))
    return [...supplements, ...ROUTINE_PRODUCTS]
  }, [dbProducts])

  // ── 표시할 제품 목록 ──────────────────────────────────────────────────────
  const displayedProducts = useMemo(() => {
    // 대안 탐색 모드: 기준 제품과 유사한 제품 목록
    if (referenceProduct) {
      return getSimilarProducts(referenceProduct, allProductsPool)
    }

    const term = debouncedQuery.trim().toLowerCase()
    const supplements = dbProducts.map((p) => ({
      ...p,
      category: p.category ?? ("supplement" as ProductCategory),
    }))
    const routines = term
      ? ROUTINE_PRODUCTS.filter((p) =>
          p.product_name.toLowerCase().includes(term) ||
          (p.manufacturer ?? "").toLowerCase().includes(term)
        )
      : ROUTINE_PRODUCTS

    let combined: Product[] =
      categoryFilter === "all"
        ? [...supplements, ...routines]
        : categoryFilter === "supplement"
        ? supplements
        : routines

    if (activeNutrient) {
      combined = combined.filter((p) => p.nutrients.some((n) => n.name === activeNutrient))
    }

    return combined
  }, [referenceProduct, dbProducts, debouncedQuery, categoryFilter, activeNutrient, allProductsPool])

  // ── 영양소 필터 순서: 아직 살펴보지 않은 영양소를 앞으로 ────────────────
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
    setReferenceProduct(product)
  }

  const routineSelectedCount = selectedProducts.filter((p) =>
    ROUTINE_CATEGORIES.has(p.category ?? ("" as ProductCategory))
  ).length

  return (
    <div className="h-full flex flex-col bg-[#FFFBF7]">

      {/* ── 스티키 헤더 ── */}
      <div className="flex-shrink-0 bg-[#FFFBF7]/95 backdrop-blur-sm px-5 pt-4 pb-3 border-b border-stone-100/50">

        {/* 컨텍스트 배너 (검색 중이거나 대안 탐색 중이 아닐 때 전체 표시) */}
        {!debouncedQuery && (
          <>
            {/* 외부 진입 맥락 인디케이터 (Home/Record에서 특정 영양소 연결로 진입 시) */}
            {initialNutrient && activeNutrient === initialNutrient && (
              <div className="mb-2 flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-bold text-stone-400">
                  홈에서 이어서 살펴보는 중 ·{" "}
                  <span className="text-orange-500">{initialNutrient}</span>
                </span>
                <button
                  onClick={() => setActiveNutrient(null)}
                  className="text-[10px] font-bold text-stone-400 hover:text-stone-600"
                >
                  전체 보기
                </button>
              </div>
            )}
            <SearchContextBanner
              monthsOld={monthsOld}
              selectedProducts={selectedProducts}
              referenceProduct={referenceProduct}
              onNutrientClick={handleNutrientClick}
              onReferenceClick={handleReferenceClick}
              onClearReference={() => setReferenceProduct(null)}
            />
          </>
        )}

        {/* 검색 입력 */}
        <div className="relative group mb-3">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 group-focus-within:text-orange-500 transition-colors">
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
            className="w-full pl-11 pr-10 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:border-orange-400 shadow-sm text-sm font-medium text-stone-700 placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-4 flex items-center text-stone-400 hover:text-stone-600"
            >
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 카테고리 탭 + 모드 표시 */}
        <div className="flex items-center gap-2 mb-3">
          {referenceProduct ? (
            // 대안 탐색 모드일 때 탭 대신 모드 인디케이터
            <div className="flex items-center gap-2 w-full">
              <span className="text-[11px] font-bold text-orange-500 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
                비슷한 제품 탐색 중
              </span>
              <button
                onClick={() => setReferenceProduct(null)}
                className="ml-auto text-[11px] font-bold text-stone-400 hover:text-stone-600"
              >
                전체 목록으로
              </button>
            </div>
          ) : (
            (
              [
                { key: "all", label: "전체" },
                { key: "supplement", label: "💊 건기식" },
                { key: "routine", label: `🍼 분유·우유·치즈${routineSelectedCount > 0 ? ` (${routineSelectedCount})` : ""}` },
              ] as { key: CategoryFilter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors ${
                  categoryFilter === key
                    ? key === "routine"
                      ? "bg-blue-500 text-white"
                      : "bg-stone-800 text-white"
                    : "bg-white border border-stone-200 text-stone-500"
                }`}
              >
                {label}
              </button>
            ))
          )}
        </div>

        {/* 영양소 필터 — 아직 살펴보지 않은 영양소를 앞으로, 해당 항목에 점 표시 */}
        {!referenceProduct && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveNutrient(null)}
              className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                activeNutrient === null ? "bg-stone-800 text-white" : "bg-white border border-stone-200 text-stone-500"
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
                      ? "bg-stone-800 text-white"
                      : isUnder
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-white border border-stone-200 text-stone-500"
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

      {/* ── 제품 목록 ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-5 pb-4 pt-3 flex flex-col gap-3">
          {/* 대안 탐색 결과 헤더 */}
          {referenceProduct && displayedProducts.length > 0 && (
            <p className="text-[11px] font-bold text-stone-400 text-center py-1">
              {displayedProducts.length}개의 비슷한 제품을 찾았어요
            </p>
          )}

          {displayedProducts.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm font-bold">
              {referenceProduct
                ? "비슷한 성분의 다른 제품을 찾지 못했어요"
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
