"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import type { Product } from "@/lib/types"
import { ROUTINE_FOODS, CATEGORY_ICON, CATEGORY_LABEL } from "@/lib/routine_foods"
import type { RoutineFood } from "@/lib/routine_foods"

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const RECOMMENDED_NUTRIENTS = [
  "칼슘", "철", "아연", "비타민D", "비타민C", "비타민A", "오메가3", "프로바이오틱스",
]

const PRODUCT_COLORS = [
  "#fb923c", "#fb7185", "#2dd4bf", "#34d399",
  "#fbbf24", "#38bdf8", "#a78bfa", "#818cf8",
]

// ─── 제품 카드 (아코디언) ──────────────────────────────────────────────────────
function MobileProductCard({
  product,
  selected,
  onToggle,
  expanded,
  onToggleExpand,
  color,
}: {
  product: Product
  selected: boolean
  onToggle: () => void
  expanded: boolean
  onToggleExpand: () => void
  color: string | undefined
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

        {/* 색상 도트 (선택된 경우) */}
        {selected && color && (
          <div
            className="absolute left-[52px] top-[18px] w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}

        {/* 텍스트 */}
        <div className="flex-1 min-w-0 pr-8">
          <p className="text-[10px] font-bold text-stone-400 mb-0.5">{product.manufacturer ?? ""}</p>
          <h3 className={`font-extrabold text-[15px] leading-tight ${selected ? "text-orange-600" : "text-stone-800"}`}>
            {product.product_name}
          </h3>

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

        {/* 아코디언 토글 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
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
                <span className="text-xs font-bold text-stone-800">{n.amount}{n.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 루틴 식품 카드 ───────────────────────────────────────────────────────────
function RoutineFoodCard({
  food,
  selectedAmount,
  onSet,
  onRemove,
}: {
  food: RoutineFood
  selectedAmount: number | null
  onSet: (food: RoutineFood, amount: number) => void
  onRemove: (id: string) => void
}) {
  const isSelected = selectedAmount !== null
  const step       = food.baseUnit === "ml" ? 50 : 1
  const minAmount  = food.baseUnit === "ml" ? 50 : 1
  const amount     = selectedAmount ?? food.defaultAmount
  const unitLabel  = food.baseUnit === "ml" ? "ml" : "장"

  return (
    <div className={`bg-white rounded-2xl border-2 p-3 flex items-center gap-3 transition-all ${isSelected ? "border-blue-400 shadow-sm shadow-blue-100" : "border-stone-100"}`}>
      <span className="text-2xl shrink-0">{CATEGORY_ICON[food.category]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-stone-800 leading-tight">{food.name}</p>
        <p className="text-[10px] font-bold text-stone-400">{food.brand} · {CATEGORY_LABEL[food.category]}</p>
        {isSelected && (
          <p className="text-[10px] font-bold text-blue-500 mt-0.5">하루 {amount}{unitLabel}</p>
        )}
      </div>

      {isSelected ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onSet(food, Math.max(minAmount, amount - step))}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-100 text-stone-600 font-bold text-base active:bg-stone-200"
          >−</button>
          <span className="text-sm font-extrabold text-blue-600 min-w-[44px] text-center">{amount}{unitLabel}</span>
          <button
            onClick={() => onSet(food, amount + step)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-100 text-stone-600 font-bold text-base active:bg-stone-200"
          >+</button>
          <button
            onClick={() => onRemove(food.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-400 ml-1 active:bg-rose-100"
          >
            <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => onSet(food, food.defaultAmount)}
          className="shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-extrabold border border-blue-200 active:bg-blue-100"
        >
          + 등록
        </button>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function SearchClient({
  initialProducts,
}: {
  initialProducts: Product[]
}) {
  const { selectedProducts, toggleProduct, selectedRoutineFoods, setRoutineFood, removeRoutineFood } = useAppStore()

  const [showRoutine, setShowRoutine] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeNutrient, setActiveNutrient] = useState<string | null>(null)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>(initialProducts)
  const [isSearching, setIsSearching] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // colorMap은 selectedProducts 기준으로 유지
  const colorMap = new Map(
    selectedProducts.map((p, i) => [p.id, PRODUCT_COLORS[i % PRODUCT_COLORS.length]])
  )

  // ── 디바운스 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
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

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isSelected = (id: number) => selectedProducts.some((p) => p.id === id)

  return (
    <div className="h-full flex flex-col bg-[#FFFBF7]">

      {/* 스티키 검색 + 필터 탭 */}
      <div className="flex-shrink-0 bg-[#FFFBF7]/95 backdrop-blur-sm px-5 py-4 border-b border-stone-100/50">

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
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.1" y2="16.1" />
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

      {/* 루틴 식품 등록 섹션 */}
      <div className="px-5 pt-3 pb-2">
        <button
          onClick={() => setShowRoutine((v) => !v)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left ${
            showRoutine
              ? "bg-blue-50 border-blue-200"
              : "bg-white border-stone-200 hover:border-blue-200 hover:bg-blue-50/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🍼</span>
            <div>
              <p className="text-xs font-extrabold text-stone-800">루틴 식품 등록하기 (분유/우유)</p>
              <p className="text-[10px] font-bold text-stone-400">
                {selectedRoutineFoods.length > 0
                  ? `${selectedRoutineFoods.length}개 등록됨 · 영양소 합산에 반영됩니다`
                  : "매일 먹이는 분유/우유를 등록하면 더 정확해져요"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedRoutineFoods.length > 0 && (
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                {selectedRoutineFoods.length}개
              </span>
            )}
            <svg
              width={16} height={16}
              className={`transition-transform text-stone-400 ${showRoutine ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showRoutine && (
          <div className="mt-2 flex flex-col gap-2">
            {(["formula", "milk", "cheese"] as const).map((cat) => {
              const foods = ROUTINE_FOODS.filter((f) => f.category === cat)
              return (
                <div key={cat}>
                  <p className="text-[10px] font-extrabold text-stone-400 px-1 mb-1.5 mt-1">
                    {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
                  </p>
                  <div className="flex flex-col gap-2">
                    {foods.map((food) => {
                      const sel = selectedRoutineFoods.find((f) => f.food.id === food.id)
                      return (
                        <RoutineFoodCard
                          key={food.id}
                          food={food}
                          selectedAmount={sel ? sel.amountPerDay : null}
                          onSet={setRoutineFood}
                          onRemove={removeRoutineFood}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 제품 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-5 pb-4 pt-2 flex flex-col gap-3">
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
                color={colorMap.get(product.id)}
              />
            ))
          )}
        </div>
      </div>

    </div>
  )
}
