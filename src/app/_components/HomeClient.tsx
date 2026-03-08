"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import {
  AGE_GROUP_LABEL,
  getAgeGroup,
  getUpperLimits,
  getRecommendedIntakes,
  MIN_MONTHS,
  MAX_MONTHS,
} from "@/lib/kdri_data"
import { PERIOD_CONFIG, getMultiplier } from "@/lib/nutrition_utils"
import type { AggregatedNutrient, Product } from "@/lib/types"
import { CATEGORY_ICON } from "@/lib/routine_foods"

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const SUPPLEMENT_COLORS = [
  "#fb923c", "#fb7185", "#2dd4bf", "#34d399",
  "#fbbf24", "#38bdf8", "#a78bfa", "#818cf8",
]
const ROUTINE_COLOR = "#60a5fa"
const ROUTINE_CATEGORIES = new Set(["formula", "milk", "cheese"])

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function aggregateNutrients(products: Product[]): AggregatedNutrient[] {
  const map = new Map<string, { amount: number; unit: string }>()
  for (const product of products) {
    const mult = getMultiplier(product)
    for (const nutrient of product.nutrients) {
      const key = `${nutrient.name}||${nutrient.unit}`
      const amount = parseFloat((nutrient.amount * mult).toFixed(4))
      const existing = map.get(key)
      if (existing) {
        existing.amount = parseFloat((existing.amount + amount).toFixed(4))
      } else {
        map.set(key, { amount, unit: nutrient.unit })
      }
    }
  }
  return Array.from(map.entries()).map(([key, value]) => ({
    name: key.split("||")[0],
    ...value,
  }))
}

function getULComparison(
  n: { name: string; amount: number; unit: string },
  upperLimits: Record<string, number>
): { ul: number | undefined; compareAmount: number } {
  if (n.name === "비타민D" && n.unit === "IU") {
    return { ul: upperLimits["비타민D||μg"], compareAmount: n.amount / 40 }
  }
  return { ul: upperLimits[`${n.name}||${n.unit}`], compareAmount: n.amount }
}

// ─── 바 차트 컴포넌트 ─────────────────────────────────────────────────────────
function StandardNutrientBar({
  name, unit, ul, ri, totalAmount, selectedProducts, colorMap,
}: {
  name: string; unit: string
  ul: number
  ri: number
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
            <div
              className="absolute inset-0 rounded-r-full"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)" }}
            />
          </div>
        )}

        {riPct !== null && (
          <div
            style={{ left: `${riPct}%` }}
            className={`absolute top-[-5px] bottom-[-5px] w-[2px] z-20 rounded-full ${isMet && !isExceeded ? "bg-emerald-500" : "bg-amber-400"}`}
          />
        )}
        <div
          style={{ left: `${limitPct}%` }}
          className={`absolute top-[-4px] bottom-[-4px] w-0.5 z-20 rounded-full ${isExceeded ? "bg-rose-600" : "bg-stone-300"}`}
        />
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function HomeClient() {
  const {
    selectedProducts, monthsOld, setMonthsOld, toggleProduct,
  } = useAppStore()

  const aggNutrients = useMemo(() => aggregateNutrients(selectedProducts), [selectedProducts])
  const riData       = useMemo(() => getRecommendedIntakes(monthsOld), [monthsOld])
  const upperLimits  = useMemo(() => getUpperLimits(monthsOld), [monthsOld])
  const ageGroup     = getAgeGroup(monthsOld)

  // 루틴 카테고리는 파란색, 건기식은 순서대로 색상 배정
  const colorMap = useMemo(() => {
    let suppIndex = 0
    return new Map(
      selectedProducts.map((p) => {
        const isRoutine = ROUTINE_CATEGORIES.has(p.category ?? "")
        const color = isRoutine ? ROUTINE_COLOR : SUPPLEMENT_COLORS[suppIndex++ % SUPPLEMENT_COLORS.length]
        return [p.id, color]
      })
    )
  }, [selectedProducts])

  const kdriKeys = useMemo(() => {
    const keys = new Set<string>()
    Object.keys(riData).forEach((k) => keys.add(k))
    Object.keys(upperLimits).forEach((k) => keys.add(k))
    return keys
  }, [riData, upperLimits])

  const standardNutrients = useMemo(() => {
    return Array.from(kdriKeys).map((key) => {
      const [name, unit] = key.split("||")
      const aggNutrient = aggNutrients.find((n) => `${n.name}||${n.unit}` === key) ?? { name, amount: 0, unit }
      const { ul, compareAmount: totalAmount } = getULComparison(aggNutrient, upperLimits)
      const ri = riData[key]?.ri ?? 0
      return { key, name, unit, ul, ri, totalAmount }
    }).filter((item) => item.ul !== undefined)
  }, [kdriKeys, aggNutrients, upperLimits, riData])

  const extraNutrients = useMemo(() => {
    const extras: { name: string; unit: string; amount: number }[] = []
    const seen = new Set<string>()
    for (const n of aggNutrients) {
      const key = `${n.name}||${n.unit}`
      if (kdriKeys.has(key) || seen.has(key) || n.amount === 0) continue
      extras.push({ name: n.name, unit: n.unit, amount: n.amount })
      seen.add(key)
    }
    return extras
  }, [kdriKeys, aggNutrients])

  const exceededCount = standardNutrients.filter((n) => n.ul !== undefined && n.totalAmount > n.ul!).length
  const hasAnyData    = selectedProducts.length > 0

  const routineCount    = selectedProducts.filter((p) => ROUTINE_CATEGORIES.has(p.category ?? "")).length
  const supplementCount = selectedProducts.filter((p) => !ROUTINE_CATEGORIES.has(p.category ?? "")).length

  // ── 브리핑 레이어 ──────────────────────────────────────────────────────────
  const briefing = PERIOD_CONFIG[ageGroup]

  // ri > 0이고 아직 목표에 못 미치는 영양소 수
  const underCount = standardNutrients.filter((n) => n.ri > 0 && n.totalAmount < n.ri).length

  // 현재 상태 배지 (처방/의료 언어 사용 금지)
  const statusInfo = (() => {
    if (!hasAnyData) return { text: "아직 시작 전이에요", cls: "text-stone-400 bg-stone-100" }
    if (exceededCount > 0) return { text: `${exceededCount}개 상한 초과`, cls: "text-rose-600 bg-rose-50" }
    if (underCount > 0) return { text: `${underCount}개 더 살펴볼 수 있어요`, cls: "text-amber-600 bg-amber-50" }
    return { text: "설계가 잘 됐어요", cls: "text-emerald-600 bg-emerald-50" }
  })()

  // 살펴볼 첫 번째 영양소 (미달만 — 초과 영양소 필터는 검색과 무관) — Search 딥링크용
  // 초과 영양소를 딥링크 대상으로 쓰면 "해당 영양소 포함 제품 탐색" 으로 연결되어
  // 오히려 더 추가하도록 유도할 수 있으므로 미달 영양소만 사용합니다.
  const firstFocusNutrient: string | null =
    standardNutrients.find((n) => n.ri > 0 && n.totalAmount < n.ri)?.name ?? null

  // 다음 행동 CTA
  const ctaInfo = (() => {
    if (!hasAnyData) return { text: "이 시기 많이 살펴보는 제품 보기", href: "/search" }
    if (exceededCount > 0 || underCount > 0) {
      const href = firstFocusNutrient
        ? `/search?nutrient=${encodeURIComponent(firstFocusNutrient)}`
        : "/search"
      return { text: "탐색 탭에서 더 살펴보기", href }
    }
    return { text: "성장 기록 보기", href: "/record" }
  })()

  return (
    <div className="h-full overflow-y-auto scrollbar-hide flex flex-col bg-[#FFFBF7]">

      {/* ── 스티키 헤더 ── */}
      <div className="flex-shrink-0 bg-white shadow-[0_8px_20px_rgb(0,0,0,0.04)] rounded-b-3xl border-b border-orange-50 z-10">

        {/* 타이틀 + 나이 선택 */}
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

          {/* 나이 선택 — 터치 영역 개선 (w-8 h-8 rounded-full) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMonthsOld(Math.max(MIN_MONTHS, monthsOld - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 font-bold text-base active:bg-stone-200 transition-colors"
              aria-label="나이 줄이기"
            >
              −
            </button>
            <span className="text-sm font-extrabold text-orange-600 w-12 text-center tabular-nums">
              {monthsOld}개월
            </span>
            <button
              onClick={() => setMonthsOld(Math.min(MAX_MONTHS, monthsOld + 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 font-bold text-base active:bg-stone-200 transition-colors"
              aria-label="나이 늘리기"
            >
              +
            </button>
          </div>
        </div>

        {/* ── 시기 브리핑 카드 ── */}
        <div className="mx-5 mb-3 bg-orange-50/70 border border-orange-100 rounded-2xl px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold text-orange-500 leading-none mt-0.5">
              {monthsOld}개월 · {briefing.period}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none ${statusInfo.cls}`}>
              {statusInfo.text}
            </span>
          </div>
          <p className="text-[12px] font-medium text-stone-600 mb-2.5 leading-relaxed">
            {briefing.message}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            {briefing.focus.map((n: string) => (
              <span key={n} className="text-[10px] font-extrabold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                {n}
              </span>
            ))}
          </div>
          <Link
            href={ctaInfo.href}
            className="text-[11px] font-extrabold text-orange-500 flex items-center gap-0.5 hover:text-orange-600 transition-colors"
          >
            {ctaInfo.text}
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* ── 영양소 누적 합산 바 차트 ── */}
        <div className="px-5 pb-5 max-h-[200px] overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-stone-400 flex items-center gap-1">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              영양소 누적 합산량
            </h2>
            <div className="flex items-center gap-2">
              {routineCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: ROUTINE_COLOR }} />
                  <span className="text-[9px] font-bold text-blue-400">분유·우유</span>
                  <div className="w-2 h-2 rounded-sm bg-orange-400 ml-1" />
                  <span className="text-[9px] font-bold text-stone-400">건기식</span>
                </div>
              )}
              {exceededCount > 0 && (
                <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {exceededCount}개 상한초과
                </span>
              )}
            </div>
          </div>

          {!hasAnyData ? (
            <div className="text-[11px] text-stone-300 text-center py-3 font-bold">
              제품을 담으면 영양소 현황이 표시됩니다
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {standardNutrients.map((item) => (
                <StandardNutrientBar
                  key={item.key}
                  name={item.name}
                  unit={item.unit}
                  ul={item.ul!}
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
      </div>

      {/* ── 스크롤 영역: 통합 제품 목록 ── */}
      <div className="flex-1 px-5 pt-5 pb-4">
        {!hasAnyData ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm font-bold text-stone-500">아직 담은 제품이 없어요</p>
            <p className="text-xs text-stone-400 font-medium leading-relaxed">
              탐색 탭에서 분유·우유·영양제를<br />설계에 추가해보세요
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {routineCount > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-stone-400">루틴 식품 ({routineCount}개)</h3>
                {selectedProducts
                  .filter((p) => ROUTINE_CATEGORIES.has(p.category ?? ""))
                  .map((p) => {
                    const unitLabel = p.base_unit === "ml" ? "ml" : "장"
                    return (
                      <div key={p.id} className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-center gap-3">
                        <span className="text-xl shrink-0">
                          {CATEGORY_ICON[p.category as "formula" | "milk" | "cheese"] ?? "🍼"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-stone-400">{p.manufacturer ?? ""}</p>
                          <p className="font-bold text-stone-800 text-sm truncate">{p.product_name}</p>
                          <p className="text-[10px] font-bold text-blue-500 mt-0.5">
                            하루 {p.daily_serving_count}{unitLabel}
                          </p>
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
              </div>
            )}

            {supplementCount > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-stone-400">건기식 섭취 목록 ({supplementCount}개)</h3>
                {selectedProducts
                  .filter((p) => !ROUTINE_CATEGORIES.has(p.category ?? ""))
                  .map((p) => {
                    const color = colorMap.get(p.id)
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
              </div>
            )}

            <Link
              href="/search"
              className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-orange-500 border-2 border-dashed border-orange-200 rounded-2xl hover:bg-orange-50 transition-colors"
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
