"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { AGE_GROUP_LABEL, getAgeGroup, getUpperLimits } from "@/lib/kdri_data"
import type { AggregatedNutrient, Product } from "@/lib/types"

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const PRODUCT_COLORS = [
  "#fb923c", "#fb7185", "#2dd4bf", "#34d399",
  "#fbbf24", "#38bdf8", "#a78bfa", "#818cf8",
]

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function getULComparison(
  n: AggregatedNutrient,
  upperLimits: Record<string, number>
): { ul: number | undefined; compareAmount: number } {
  if (n.name === "비타민D" && n.unit === "IU") {
    return { ul: upperLimits["비타민D||μg"], compareAmount: n.amount / 40 }
  }
  return { ul: upperLimits[`${n.name}||${n.unit}`], compareAmount: n.amount }
}

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
function MobileNutrientBar({
  nutrient,
  ul,
  compareAmount,
  selectedProducts,
  colorMap,
}: {
  nutrient: AggregatedNutrient
  ul: number
  compareAmount: number
  selectedProducts: Product[]
  colorMap: Map<number, string>
}) {
  const isExceeded = compareAmount > ul
  const scaleMax = Math.max(ul, compareAmount)
  const limitPct = (ul / scaleMax) * 100
  const ulUnit = nutrient.name === "비타민D" && nutrient.unit === "IU" ? "μg" : nutrient.unit
  const displayAmount = compareAmount % 1 === 0 ? compareAmount : parseFloat(compareAmount.toFixed(2))

  const segments = selectedProducts.flatMap((p) => {
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
        <span className={`text-[10px] font-bold ${isExceeded ? "text-rose-600" : "text-stone-500"}`}>
          {displayAmount}{ulUnit}
          <span className="text-stone-300 font-medium"> / 상한 {ul}</span>
        </span>
      </div>

      <div className="relative w-full h-2.5 bg-stone-100 rounded-full">
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          {segments.map((seg) => (
            <div
              key={seg.id}
              style={{ width: `${seg.widthPct}%`, backgroundColor: colorMap.get(seg.id) ?? "#94a3b8" }}
              className="h-full border-r border-white/30 last:border-0"
            />
          ))}
        </div>

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

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function HomeClient() {
  const { selectedProducts, monthsOld, setMonthsOld, toggleProduct } = useAppStore()

  const aggregated = useMemo(() => aggregateNutrients(selectedProducts), [selectedProducts])
  const upperLimits = getUpperLimits(monthsOld)
  const ageGroup = getAgeGroup(monthsOld)

  const colorMap = useMemo(
    () => new Map(selectedProducts.map((p, i) => [p.id, PRODUCT_COLORS[i % PRODUCT_COLORS.length]])),
    [selectedProducts]
  )

  const chartNutrients = aggregated.filter((n) => {
    const { ul, compareAmount } = getULComparison(n, upperLimits)
    return ul !== undefined && compareAmount > 0
  })

  const exceededCount = chartNutrients.filter((n) => {
    const { ul, compareAmount } = getULComparison(n, upperLimits)
    return ul !== undefined && compareAmount > ul
  }).length

  return (
    <div className="h-full overflow-y-auto scrollbar-hide flex flex-col bg-[#FFFBF7]">

      {/* 헤더 & 월령 선택 */}
      <div className="flex-shrink-0 bg-white shadow-[0_8px_20px_rgb(0,0,0,0.04)] rounded-b-3xl border-b border-orange-50 z-10">

        <div className="px-5 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
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

          {/* +/- 월령 선택기 */}
          <div className="flex items-center gap-2 bg-[#FFFBF7] border border-stone-200 rounded-xl px-2 py-1">
            <button
              onClick={() => setMonthsOld(Math.max(0, monthsOld - 1))}
              className="w-6 h-6 flex items-center justify-center text-stone-400 font-bold text-lg leading-none"
            >
              -
            </button>
            <span className="text-sm font-extrabold text-orange-600 w-10 text-center">
              {monthsOld}개월
            </span>
            <button
              onClick={() => setMonthsOld(Math.min(36, monthsOld + 1))}
              className="w-6 h-6 flex items-center justify-center text-stone-400 font-bold text-lg leading-none"
            >
              +
            </button>
          </div>
        </div>

        {/* 선택 제품 칩 */}
        <div className="px-5 pb-3">
          {selectedProducts.length === 0 ? (
            <Link href="/search">
              <div className="text-[11px] text-stone-400 font-bold bg-stone-50 py-2 px-3 rounded-lg text-center border border-dashed border-stone-200 hover:border-orange-300 hover:text-orange-400 transition-colors cursor-pointer">
                [탐색] 탭에서 제품을 담아 시뮬레이션 해보세요 →
              </div>
            </Link>
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
                    onClick={() => toggleProduct(p)}
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
        <div className="px-5 pb-5 max-h-[180px] overflow-y-auto scrollbar-hide">
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
            <div className="flex flex-col gap-3">
              {chartNutrients.map((n, i) => {
                const { ul, compareAmount } = getULComparison(n, upperLimits)
                return (
                  <MobileNutrientBar
                    key={i}
                    nutrient={n}
                    ul={ul!}
                    compareAmount={compareAmount}
                    selectedProducts={selectedProducts}
                    colorMap={colorMap}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 섭취 목록 영역 */}
      <div className="flex-1 px-5 pt-5 pb-4">
        {selectedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-10">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-300">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="font-extrabold text-stone-600 mb-1">아직 담은 제품이 없어요</p>
              <p className="text-sm text-stone-400 font-medium">탐색 탭에서 영양제를 찾아<br />섭취 목록에 추가해보세요</p>
            </div>
            <Link
              href="/search"
              className="mt-2 px-6 py-2.5 bg-orange-500 text-white text-sm font-extrabold rounded-2xl shadow-md shadow-orange-500/30 hover:bg-orange-600 transition-colors"
            >
              제품 탐색하러 가기 →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-stone-400 mb-1">현재 섭취 목록 ({selectedProducts.length}개)</h3>
            {selectedProducts.map((p, i) => {
              const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
              const servingText =
                p.daily_serving_count && p.amount_per_serving && p.serving_unit
                  ? `${p.daily_serving_count}회 × ${p.amount_per_serving}${p.serving_unit}`
                  : null
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3.5 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-stone-400">{p.manufacturer ?? ""}</p>
                    <p className="font-bold text-stone-800 text-sm truncate">{p.product_name}</p>
                    {servingText && (
                      <p className="text-[10px] text-stone-400 font-medium mt-0.5">{servingText}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleProduct(p)}
                    className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors flex-shrink-0"
                  >
                    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
            <Link
              href="/search"
              className="mt-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-orange-500 border-2 border-dashed border-orange-200 rounded-2xl hover:bg-orange-50 transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.1" y2="16.1" />
              </svg>
              제품 더 추가하기
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
