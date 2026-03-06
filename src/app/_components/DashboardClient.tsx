"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import {
  AGE_GROUP_LABEL,
  getAgeGroup,
  getUpperLimits,
} from "@/lib/kdri_data"
import { useAppStore } from "@/lib/store"
import { computeRoutineContribution } from "@/lib/routine_foods"

// ─── 타입 ─────────────────────────────────────────────────────────────────────
type Nutrient = {
  name: string
  amount: number
  unit: string
}

type Product = {
  id: number
  product_name: string
  manufacturer: string | null
  functionality: string | null
  precautions: string | null
  daily_serving_count: number | null
  amount_per_serving: number | null
  serving_unit: string | null
  nutrients: Nutrient[]
}

type AggregatedNutrient = {
  name: string
  amount: number
  unit: string
}

const RECOMMENDED_NUTRIENTS = [
  "칼슘", "철", "아연", "비타민D", "비타민C", "비타민A", "오메가3", "프로바이오틱스",
]

const PRODUCT_COLORS = [
  "#fb923c", // orange-400
  "#fb7185", // rose-400
  "#2dd4bf", // teal-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#38bdf8", // sky-400
  "#a78bfa", // violet-400
  "#818cf8", // indigo-400
]

// ─── 비타민D IU → μg 변환 ────────────────────────────────────────────────────
function getULComparison(
  n: AggregatedNutrient,
  upperLimits: Record<string, number>
): { ul: number | undefined; compareAmount: number } {
  if (n.name === "비타민D" && n.unit === "IU") {
    return { ul: upperLimits["비타민D||μg"], compareAmount: n.amount / 40 }
  }
  return { ul: upperLimits[`${n.name}||${n.unit}`], compareAmount: n.amount }
}

// ─── 합산 엔진 ────────────────────────────────────────────────────────────────
function aggregateNutrients(products: Product[]): AggregatedNutrient[] {
  const map = new Map<string, { amount: number; unit: string }>()
  for (const product of products) {
    for (const nutrient of product.nutrients) {
      const key = `${nutrient.name}||${nutrient.unit}`
      const existing = map.get(key)
      if (existing) {
        existing.amount = parseFloat((existing.amount + nutrient.amount).toFixed(4))
      } else {
        map.set(key, { amount: nutrient.amount, unit: nutrient.unit })
      }
    }
  }
  return Array.from(map.entries()).map(([key, value]) => ({
    name: key.split("||")[0],
    ...value,
  }))
}

// ─── 모바일 컴팩트 바 차트 ────────────────────────────────────────────────────
const ROUTINE_COLOR = "#60a5fa" // blue-400 — 루틴 식품 전용 색상

function MobileNutrientBar({
  nutrient,
  ul,
  compareAmount,
  routineAmount,
  selectedProducts,
  colorMap,
}: {
  nutrient: AggregatedNutrient
  ul: number
  compareAmount: number   // supplement + routine 합산 (UL 단위 기준)
  routineAmount: number   // 루틴 식품 기여분
  selectedProducts: Product[]
  colorMap: Map<number, string>
}) {
  const isExceeded   = compareAmount > ul
  const scaleMax     = Math.max(ul, compareAmount)
  const limitPct     = (ul / scaleMax) * 100
  const ulUnit       = nutrient.name === "비타민D" && nutrient.unit === "IU" ? "μg" : nutrient.unit
  const displayAmount = compareAmount % 1 === 0 ? compareAmount : parseFloat(compareAmount.toFixed(2))

  // 루틴 식품 세그먼트
  const routinePct = routineAmount > 0 ? (routineAmount / scaleMax) * 100 : 0

  // 건기식 제품별 세그먼트
  const suppSegments = selectedProducts.flatMap((p) => {
    const n = p.nutrients.find((pn) => pn.name === nutrient.name && pn.unit === nutrient.unit)
    if (!n || n.amount === 0) return []
    const amount = nutrient.name === "비타민D" && nutrient.unit === "IU" ? n.amount / 40 : n.amount
    return [{ id: p.id, widthPct: (amount / scaleMax) * 100 }]
  })

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-end">
        <span className={`text-[11px] font-extrabold ${isExceeded ? "text-rose-600" : "text-stone-700"}`}>
          {nutrient.name}
        </span>
        <div className="flex items-center gap-1">
          {routineAmount > 0 && (
            <span className="text-[9px] font-bold text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-md">
              🍼 {parseFloat(routineAmount.toFixed(2))}{ulUnit}
            </span>
          )}
          <span className={`text-[10px] font-bold ${isExceeded ? "text-rose-600" : "text-stone-500"}`}>
            {displayAmount}{ulUnit}
            <span className="text-stone-300 font-medium"> / 상한 {ul}</span>
          </span>
        </div>
      </div>

      <div className="relative w-full h-2.5 bg-stone-100 rounded-full">
        {/* 세그먼트: [루틴 식품 (파랑)] + [건기식 제품들 (각 색상)] */}
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          {routinePct > 0 && (
            <div
              style={{ width: `${routinePct}%`, backgroundColor: ROUTINE_COLOR }}
              className="h-full border-r border-white/40 shrink-0"
            />
          )}
          {suppSegments.map((seg) => (
            <div
              key={seg.id}
              style={{ width: `${seg.widthPct}%`, backgroundColor: colorMap.get(seg.id) ?? "#94a3b8" }}
              className="h-full border-r border-white/30 last:border-0 shrink-0"
            />
          ))}
        </div>

        {/* 초과 시 빨간 사선 오버레이 */}
        {isExceeded && (
          <div
            style={{ left: `${limitPct}%`, width: `${100 - limitPct}%` }}
            className="absolute top-0 bottom-0 bg-rose-500 z-10 opacity-90 rounded-r-full"
          >
            <div
              className="absolute inset-0 rounded-r-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)",
              }}
            />
          </div>
        )}

        {/* 상한선 마커 */}
        <div
          style={{ left: `${limitPct}%` }}
          className={`absolute top-[-4px] bottom-[-4px] w-0.5 z-20 rounded-full ${
            isExceeded ? "bg-rose-600" : "bg-stone-300"
          }`}
        />
      </div>
    </div>
  )
}

// ─── 모바일 제품 카드 (아코디언) ──────────────────────────────────────────────
function MobileProductCard({
  product,
  selected,
  onToggle,
  expanded,
  onToggleExpand,
  colorMap,
}: {
  product: Product
  selected: boolean
  onToggle: () => void
  expanded: boolean
  onToggleExpand: () => void
  colorMap: Map<number, string>
}) {
  const servingText =
    product.daily_serving_count && product.amount_per_serving && product.serving_unit
      ? `${product.daily_serving_count}회 × ${product.amount_per_serving}${product.serving_unit}`
      : null

  return (
    <div
      onClick={onToggle}
      className={`bg-white rounded-2xl border-2 transition-all cursor-pointer flex flex-col relative overflow-hidden ${
        selected ? "border-orange-500 shadow-md shadow-orange-500/10" : "border-stone-100"
      }`}
    >
      {/* 기본 정보 행 */}
      <div className="p-4 flex gap-3 items-start relative">
        {/* 체크박스 */}
        <div
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected ? "bg-orange-500 border-orange-500 text-white" : "border-stone-300 text-transparent"
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0 pr-8">
          <p className="text-[10px] font-bold text-stone-400 mb-0.5">{product.manufacturer ?? ""}</p>
          <h3 className="font-extrabold text-stone-800 text-[15px] leading-tight">{product.product_name}</h3>

          {/* 영양소 태그 */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {product.nutrients.map((n, i) => (
              <span
                key={i}
                className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                  selected
                    ? "bg-orange-50 text-orange-600"
                    : "bg-stone-50 text-stone-500 border border-stone-100"
                }`}
              >
                {n.name}
              </span>
            ))}
          </div>
        </div>

        {/* 아코디언 토글 (stopPropagation으로 선택 이벤트 차단) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-stone-50 text-stone-400"
        >
          <svg
            className={`w-4.5 h-4.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            width={18} height={18}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 아코디언 펼쳐진 상세 */}
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
          <div className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-2">
            {servingText && (
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <span className="text-[11px] font-bold text-stone-400">섭취방법</span>
                <span className="text-xs font-extrabold text-stone-700">{servingText}</span>
              </div>
            )}
            {product.nutrients.map((n, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-stone-500">{n.name}</span>
                <span className="text-xs font-bold text-stone-800">
                  {n.amount}{n.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function DashboardClient({
  initialProducts,
}: {
  initialProducts: Product[]
}) {
  const {
    gender, setGender,
    selectedProducts, toggleProduct: storeToggle,
    selectedRoutineFoods,
    monthsOld, setMonthsOld,
  } = useAppStore()

  const [monthInput, setMonthInput] = useState(String(monthsOld))
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeNutrient, setActiveNutrient] = useState<string | null>(null)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>(initialProducts)
  const [isSearching, setIsSearching] = useState(false)

  // store 하이드레이션 후 monthInput 동기화
  useEffect(() => {
    setMonthInput(String(monthsOld))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 검색어 디바운스 (300ms) ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── 클라이언트 영양소 필터 ────────────────────────────────────────────────
  const filterByNutrient = (products: Product[], nutrient: string | null) => {
    if (!nutrient) return products
    return products.filter((p) => p.nutrients.some((n) => n.name === nutrient))
  }

  // ── 검색 (Supabase) + 영양소 필터 (클라이언트) ──────────────────────────
  useEffect(() => {
    const term = debouncedQuery.trim()

    if (!term) {
      setDisplayedProducts(filterByNutrient(initialProducts, activeNutrient))
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
        if (!error && data) {
          setDisplayedProducts(filterByNutrient(data as Product[], activeNutrient))
        }
        setIsSearching(false)
      })
  }, [debouncedQuery, activeNutrient, initialProducts])

  // ── 토글 ─────────────────────────────────────────────────────────────────
  const toggleProduct = (product: Product) => storeToggle(product)

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isSelected = (id: number) => selectedProducts.some((p) => p.id === id)

  // ── 파생 상태 ─────────────────────────────────────────────────────────────
  const aggregated  = useMemo(() => aggregateNutrients(selectedProducts), [selectedProducts])
  const upperLimits = getUpperLimits(monthsOld)
  const ageGroup    = getAgeGroup(monthsOld)

  const colorMap = useMemo(
    () => new Map(selectedProducts.map((p, i) => [p.id, PRODUCT_COLORS[i % PRODUCT_COLORS.length]])),
    [selectedProducts]
  )

  // 루틴 식품 영양소 합산 { "영양소||단위": 총량 }
  const routineContrib = useMemo(
    () => computeRoutineContribution(selectedRoutineFoods),
    [selectedRoutineFoods]
  )

  // 차트에 표시할 영양소: 건기식 + 루틴 식품의 합집합 (UL 있는 것만)
  const chartNutrients = useMemo(() => {
    const seen = new Set<string>()
    const items: { nutrient: AggregatedNutrient; ul: number; suppAmount: number; routineAmount: number; totalAmount: number }[] = []

    // 건기식 영양소
    for (const n of aggregated) {
      const { ul, compareAmount: suppAmt } = getULComparison(n, upperLimits)
      if (ul === undefined) continue
      const canonicalKey = n.name === "비타민D" && n.unit === "IU" ? "비타민D||μg" : `${n.name}||${n.unit}`
      const routineAmt   = routineContrib[canonicalKey] ?? 0
      const totalAmt     = suppAmt + routineAmt
      if (totalAmt === 0) continue
      items.push({ nutrient: n, ul, suppAmount: suppAmt, routineAmount: routineAmt, totalAmount: totalAmt })
      seen.add(canonicalKey)
    }

    // 루틴 식품 전용 영양소 (건기식에 없는 것)
    for (const [key, routineAmt] of Object.entries(routineContrib)) {
      if (seen.has(key) || routineAmt === 0) continue
      const ul = upperLimits[key]
      if (ul === undefined) continue
      const [name, unit] = key.split("||")
      items.push({ nutrient: { name, amount: 0, unit }, ul, suppAmount: 0, routineAmount: routineAmt, totalAmount: routineAmt })
    }

    return items
  }, [aggregated, routineContrib, upperLimits])

  const exceededCount = chartNutrients.filter((c) => c.totalAmount > c.ul).length

  return (
    <div className="flex justify-center bg-gray-100 h-screen">
      <div className="w-full max-w-md bg-[#FFFBF7] h-full flex flex-col relative overflow-hidden shadow-2xl">

        {/* =========================================
            상단: 고정 대시보드
            ========================================= */}
        <section className="flex-shrink-0 bg-white shadow-[0_8px_20px_rgb(0,0,0,0.04)] z-20 rounded-b-3xl border-b border-orange-50 relative">

          {/* 헤더 & 월령 선택 */}
          <div className="px-5 pt-6 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
                {/* Baby icon */}
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M6.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
                  <path d="M3 11c0-1 .5-2 1.5-2.5" />
                  <path d="M21 11c0-1-.5-2-1.5-2.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-stone-800 leading-tight">우리아이 영양설계</h1>
                <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                  {AGE_GROUP_LABEL[ageGroup]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
            {/* 성별 토글 */}
            <div className="flex items-center bg-stone-100 rounded-xl p-0.5">
              <button
                onClick={() => setGender("M")}
                className={`px-2.5 py-1 rounded-[10px] text-xs font-extrabold transition-colors ${
                  gender === "M" ? "bg-blue-500 text-white shadow-sm" : "text-stone-400"
                }`}
              >
                남
              </button>
              <button
                onClick={() => setGender("F")}
                className={`px-2.5 py-1 rounded-[10px] text-xs font-extrabold transition-colors ${
                  gender === "F" ? "bg-rose-400 text-white shadow-sm" : "text-stone-400"
                }`}
              >
                여
              </button>
            </div>

            {/* +/- 월령 선택기 */}
            <div className="flex items-center gap-1 bg-[#FFFBF7] border border-stone-200 rounded-xl px-2 py-1">
              <button
                onClick={() => {
                  const next = Math.max(0, monthsOld - 1)
                  setMonthsOld(next)
                  setMonthInput(String(next))
                }}
                className="w-6 h-6 flex items-center justify-center text-stone-400 font-bold text-lg leading-none"
              >
                -
              </button>
              <div className="flex items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  value={monthInput}
                  onChange={(e) => setMonthInput(e.target.value)}
                  onBlur={() => {
                    const v = parseInt(monthInput)
                    const clamped = isNaN(v) ? monthsOld : Math.min(36, Math.max(0, v))
                    setMonthsOld(clamped)
                    setMonthInput(String(clamped))
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
                  className="w-7 text-sm font-extrabold text-orange-600 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm font-extrabold text-orange-600">개월</span>
              </div>
              <button
                onClick={() => {
                  const next = Math.min(36, monthsOld + 1)
                  setMonthsOld(next)
                  setMonthInput(String(next))
                }}
                className="w-6 h-6 flex items-center justify-center text-stone-400 font-bold text-lg leading-none"
              >
                +
              </button>
            </div>
          </div>
          </div>

          {/* 선택 제품 칩 (가로 스크롤) */}
          <div className="px-5 pb-3">
            {selectedProducts.length === 0 ? (
              <div className="text-[11px] text-stone-400 font-bold bg-stone-50 py-2 px-3 rounded-lg text-center border border-dashed border-stone-200">
                아래에서 제품을 담아 시뮬레이션 해보세요
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x">
                {selectedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="snap-start shrink-0 flex items-center gap-1.5 bg-stone-50 border border-stone-100 pl-2 pr-1 py-1 rounded-full"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colorMap.get(p.id) }}
                    />
                    <span className="text-[10px] font-bold text-stone-600 truncate max-w-[80px]">
                      {p.product_name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleProduct(p) }}
                      className="bg-stone-200/50 hover:bg-stone-200 p-0.5 rounded-full text-stone-500"
                    >
                      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 영양소 누적 합산 바 차트 */}
          <div className="px-5 pb-5 max-h-[160px] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-stone-400 flex items-center gap-1">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                영양소 누적 합산량
              </h2>
              {exceededCount > 0 && (
                <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {exceededCount}개 상한초과
                </span>
              )}
            </div>

            {chartNutrients.length === 0 ? (
              <div className="text-[11px] text-stone-300 text-center py-3 font-bold">
                제품을 담으면 영양소 현황이 표시됩니다
              </div>
            ) : (
              <>
                {selectedRoutineFoods.length > 0 && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#60a5fa" }} />
                    <span className="text-[9px] font-bold text-blue-400">루틴 식품</span>
                    <div className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
                    <span className="text-[9px] font-bold text-stone-400">건기식</span>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {chartNutrients.map((item, i) => (
                    <MobileNutrientBar
                      key={i}
                      nutrient={item.nutrient}
                      ul={item.ul}
                      compareAmount={item.totalAmount}
                      routineAmount={item.routineAmount}
                      selectedProducts={selectedProducts}
                      colorMap={colorMap}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* =========================================
            하단: 스크롤 탐색 영역
            ========================================= */}
        <section className="flex-1 overflow-y-auto bg-[#FFFBF7]">

          {/* 스티키 검색 + 필터 탭 */}
          <div className="sticky top-0 bg-[#FFFBF7]/95 backdrop-blur-sm z-10 px-5 py-4 border-b border-stone-100/50">
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="어떤 영양제를 찾으시나요?"
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

            {/* 영양소 큐레이션 탭 */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveNutrient(null)}
                className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                  activeNutrient === null
                    ? "bg-stone-800 text-white"
                    : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"
                }`}
              >
                전체보기
              </button>
              {RECOMMENDED_NUTRIENTS.map((nutrient) => (
                <button
                  key={nutrient}
                  onClick={() => setActiveNutrient(activeNutrient === nutrient ? null : nutrient)}
                  className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                    activeNutrient === nutrient
                      ? "bg-stone-800 text-white"
                      : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {nutrient}
                </button>
              ))}
            </div>
          </div>

          {/* 제품 목록 */}
          <div className="px-5 pb-10 pt-2 flex flex-col gap-3">
            {displayedProducts.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-sm font-bold">
                {activeNutrient
                  ? `"${activeNutrient}" 성분이 포함된 제품이 없습니다.`
                  : `"${debouncedQuery.trim()}"에 해당하는 제품이 없습니다.`}
                <button
                  className="block mx-auto mt-3 text-xs text-orange-500 font-bold underline underline-offset-2"
                  onClick={() => { setSearchQuery(""); setActiveNutrient(null) }}
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
                  expanded={expandedIds.has(product.id)}
                  onToggleExpand={() => toggleExpand(product.id)}
                  colorMap={colorMap}
                />
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
