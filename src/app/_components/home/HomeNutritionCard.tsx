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

  const statusLabel = isExceeded ? "초과" : isMet ? "충족" : totalAmount === 0 ? "" : ""
  const badgeCls = isExceeded
    ? "bg-red-50 text-red-600 border border-red-100"
    : isMet
      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
      : ""

  const segments = selectedProducts.flatMap((p) => {
    const mult = getMultiplier(p)
    const n = p.nutrients.find((pn) => pn.name === name)
    if (!n || n.amount === 0) return []
    const rawAmt = n.name === "비타민D" && n.unit === "IU" ? (n.amount * mult) / 40 : n.amount * mult
    return rawAmt > 0 ? [{ id: p.id, widthPct: (rawAmt / scaleMax) * 100 }] : []
  })

  return (
    <div className="w-full">
      {/* Header Info */}
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm">{name}</span>
          {statusLabel && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${badgeCls}`}>
              {statusLabel}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className={`font-bold text-base tracking-tight ${isExceeded ? "text-red-500" : "text-gray-900"}`}>
            {displayAmt}
          </span>
          <span className="text-xs font-medium text-gray-500 ml-0.5">{unit}</span>
          <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
            {ri > 0 && <>목표 {ri}</>}
            {ri > 0 && <> · </>}
            상한 {ul}
          </div>
        </div>
      </div>

      {/* Progress Track — thin & precise */}
      <div className="relative h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
        {/* Fill segments */}
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          {segments.map((seg) => (
            <div
              key={seg.id}
              style={{ width: `${seg.widthPct}%`, backgroundColor: isExceeded ? undefined : (colorMap.get(seg.id) ?? "#94a3b8") }}
              className={`h-full border-r border-white/30 last:border-0 shrink-0 ${isExceeded ? "bg-red-400" : ""}`}
            />
          ))}
        </div>

        {/* Target Marker — dark vertical line */}
        {riPct !== null && (
          <div
            style={{ left: `${riPct}%` }}
            className="absolute top-0 w-[2px] h-full bg-gray-800 z-10"
          />
        )}

        {/* Limit Marker — red vertical line */}
        {limitPct < 100 && (
          <div
            style={{ left: `${limitPct}%` }}
            className="absolute top-0 w-[2px] h-full bg-red-600 z-10"
          />
        )}
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
    <section className="bg-white px-5 py-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          오늘의 영양 현황
        </h3>
        <div className="flex items-center gap-3">
          {routineCount > 0 && (
            <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROUTINE_COLOR }} />
              분유·우유
            </div>
          )}
          {exceededCount > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-sm">
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
            <div className="flex flex-col gap-5 opacity-30 select-none pointer-events-none">
              {GHOST_BARS.map((bar) => (
                <div key={bar.name}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-gray-400 text-sm">{bar.name}</span>
                    <span className="text-[11px] text-gray-300">— —</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-300 rounded-full" style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 안내 텍스트 */}
          <div className="mt-5 bg-gray-50 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700 leading-snug">
                제품을 담으면 칼슘·철·아연 상태를 한눈에 볼 수 있어요
              </p>
              <Link
                href="/search"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600"
              >
                탐색에서 제품 담기
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* filled state — 실제 바 차트 */
        <div className="space-y-7">
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
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 mb-2">기준치 미설정 성분</p>
              <div className="flex flex-wrap gap-1.5">
                {extraNutrients.map((n, i) => (
                  <span key={i} className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    {n.name} {parseFloat(n.amount.toFixed(2))}{n.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
