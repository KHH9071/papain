"use client"

import Link from "next/link"
import type { Product } from "@/lib/types"
import { getMultiplier } from "@/lib/nutrition_utils"

// ─── ghost 막대 (empty state용) ───────────────────────────────────────────────
// 실제 데이터 없이 "채워지면 이렇게 보여요" 미리보기 역할
// 임의 너비값: 확정된 영양 데이터가 아님
const GHOST_BARS = [
  { name: "칼슘",    pct: 52 },
  { name: "철",      pct: 35 },
  { name: "아연",    pct: 61 },
  { name: "비타민D", pct: 28 },
]

// ─── StandardNutrientBar ──────────────────────────────────────────────────────
// HomeClient.tsx에서 이동. 영양소 누적 세그먼트 바 차트.

function StandardNutrientBar({
  name, unit, ul, ri, totalAmount, selectedProducts, colorMap,
}: {
  name: string; unit: string
  ul: number; ri: number
  totalAmount: number
  selectedProducts: Product[]
  colorMap: Map<number, string>
}) {
  const isExceeded = totalAmount > ul
  const isMet      = ri > 0 && totalAmount >= ri
  const scaleMax   = Math.max(ul, totalAmount, 0.001)
  const limitPct   = (ul / scaleMax) * 100
  const riPct      = ri > 0 ? Math.min(100, (ri / scaleMax) * 100) : null
  const displayAmt = totalAmount % 1 === 0 ? totalAmount : parseFloat(totalAmount.toFixed(2))

  const segments = selectedProducts.flatMap((p) => {
    const mult = getMultiplier(p)
    const n = p.nutrients.find((pn) => pn.name === name)
    if (!n || n.amount === 0) return []
    const rawAmt = n.name === "비타민D" && n.unit === "IU" ? (n.amount * mult) / 40 : n.amount * mult
    return rawAmt > 0 ? [{ id: p.id, widthPct: (rawAmt / scaleMax) * 100 }] : []
  })

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-end">
        <span className={`text-[11px] font-extrabold ${isExceeded ? "text-rose-600" : isMet ? "text-emerald-700" : totalAmount === 0 ? "text-stone-400" : "text-stone-700"}`}>
          {name}
          {isMet && !isExceeded && (
            <span className="ml-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1 py-0.5 rounded">✓ 충족</span>
          )}
        </span>
        <span className={`text-[10px] font-bold ${isExceeded ? "text-rose-600" : totalAmount === 0 ? "text-stone-300" : "text-stone-500"}`}>
          {displayAmt}{unit}
          {ri > 0 && (
            <span className={`font-medium ml-1 ${isMet && !isExceeded ? "text-emerald-400" : "text-amber-400"}`}>목표 {ri}</span>
          )}
          <span className="text-stone-300 font-medium"> · 상한 {ul}</span>
        </span>
      </div>

      <div className="relative w-full h-2.5 bg-stone-100 rounded-full">
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          {segments.map((seg) => (
            <div
              key={seg.id}
              style={{ width: `${seg.widthPct}%`, backgroundColor: colorMap.get(seg.id) ?? "#94a3b8" }}
              className="h-full border-r border-white/30 last:border-0 shrink-0"
            />
          ))}
        </div>
        {isExceeded && (
          <div
            style={{ left: `${limitPct}%`, width: `${100 - limitPct}%` }}
            className="absolute top-0 bottom-0 bg-rose-500 z-10 opacity-90 rounded-r-full"
          >
            <div className="absolute inset-0 rounded-r-full" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)" }} />
          </div>
        )}
        {riPct !== null && (
          <div style={{ left: `${riPct}%` }} className={`absolute top-[-5px] bottom-[-5px] w-[2px] z-20 rounded-full ${isMet && !isExceeded ? "bg-emerald-500" : "bg-amber-400"}`} />
        )}
        <div style={{ left: `${limitPct}%` }} className={`absolute top-[-4px] bottom-[-4px] w-0.5 z-20 rounded-full ${isExceeded ? "bg-rose-600" : "bg-stone-300"}`} />
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

type NutrientItem = {
  key: string
  name: string
  unit: string
  ul: number
  ri: number
  totalAmount: number
}

type Props = {
  hasProducts: boolean
  standardNutrients: NutrientItem[]
  extraNutrients: { name: string; unit: string; amount: number }[]
  selectedProducts: Product[]
  colorMap: Map<number, string>
  exceededCount: number
  routineCount: number
}

const ROUTINE_COLOR = "#60a5fa"

export default function HomeNutritionCard({
  hasProducts, standardNutrients, extraNutrients, selectedProducts, colorMap, exceededCount, routineCount,
}: Props) {
  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl border border-stone-100 shadow-sm p-4">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[12px] font-extrabold text-stone-700 flex items-center gap-1.5">
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          오늘의 영양 현황
        </h2>
        <div className="flex items-center gap-2">
          {routineCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: ROUTINE_COLOR }} />
              <span className="text-[9px] font-bold text-blue-400">분유·우유</span>
            </div>
          )}
          {exceededCount > 0 && (
            <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
              {exceededCount}개 상한초과
            </span>
          )}
        </div>
      </div>

      {/* empty state — ghost bars + 안내 */}
      {!hasProducts ? (
        <div>
          <div className="relative">
            {/* Ghost bars */}
            <div className="flex flex-col gap-2.5 opacity-30 select-none pointer-events-none">
              {GHOST_BARS.map((bar) => (
                <div key={bar.name} className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-bold text-stone-400">{bar.name}</span>
                    <span className="text-[10px] text-stone-300">— —</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-stone-300 rounded-full" style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 안내 텍스트 */}
          <div className="mt-3 bg-stone-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-[11px] font-bold text-stone-600 leading-snug">
                제품을 담으면 칼슘·철·아연 상태를 한눈에 볼 수 있어요
              </p>
              <Link
                href="/search"
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-500"
              >
                탐색에서 제품 담기
                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* filled state — 실제 바 차트 */
        <div className="flex flex-col gap-3">
          {standardNutrients.map((item) => (
            <StandardNutrientBar
              key={item.key}
              name={item.name}
              unit={item.unit}
              ul={item.ul}
              ri={item.ri}
              totalAmount={item.totalAmount}
              selectedProducts={selectedProducts}
              colorMap={colorMap}
            />
          ))}
          {extraNutrients.length > 0 && (
            <div className="pt-1 border-t border-stone-100">
              <p className="text-[9px] font-bold text-stone-400 mb-1.5">기준치 미설정 성분</p>
              <div className="flex flex-wrap gap-1.5">
                {extraNutrients.map((n, i) => (
                  <span key={i} className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                    {n.name} {parseFloat(n.amount.toFixed(2))}{n.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
