"use client"

import { useMemo } from "react"
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
import { GROWTH_MILESTONE } from "@/lib/home_briefs"
import type { AggregatedNutrient, Product } from "@/lib/types"
import HomeHeroCard        from "./home/HomeHeroCard"
import HomeNutritionCard   from "./home/HomeNutritionCard"
import HomeGrowthBriefCard from "./home/HomeGrowthBriefCard"
import HomeQuickActions    from "./home/HomeQuickActions"
import HomeBasketSection   from "./home/HomeBasketSection"

// ─── 색상 상수 ────────────────────────────────────────────────────────────────
const SUPPLEMENT_COLORS = [
  "#fb923c", "#fb7185", "#2dd4bf", "#34d399",
  "#fbbf24", "#38bdf8", "#a78bfa", "#818cf8",
]
const ROUTINE_COLOR = "#60a5fa"
const ROUTINE_CATEGORIES = new Set(["formula", "milk", "cheese"])

// ─── 영양소 집계 ──────────────────────────────────────────────────────────────
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

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function HomeClient() {
  const { selectedProducts, monthsOld, setMonthsOld, toggleProduct } = useAppStore()

  const ageGroup    = getAgeGroup(monthsOld)
  const briefing    = PERIOD_CONFIG[ageGroup]
  const growthMilestone = GROWTH_MILESTONE[ageGroup]

  const aggNutrients  = useMemo(() => aggregateNutrients(selectedProducts), [selectedProducts])
  const riData        = useMemo(() => getRecommendedIntakes(monthsOld), [monthsOld])
  const upperLimits   = useMemo(() => getUpperLimits(monthsOld), [monthsOld])

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
    }).filter((item) => item.ul !== undefined) as {
      key: string; name: string; unit: string; ul: number; ri: number; totalAmount: number
    }[]
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

  const hasProducts    = selectedProducts.length > 0
  const exceededCount  = standardNutrients.filter((n) => n.totalAmount > n.ul).length
  const underCount     = standardNutrients.filter((n) => n.ri > 0 && n.totalAmount < n.ri).length
  const routineCount   = selectedProducts.filter((p) => ROUTINE_CATEGORIES.has(p.category ?? "")).length

  // 상태 배지
  const statusInfo = (() => {
    if (!hasProducts) return { text: "아직 시작 전이에요",       cls: "text-stone-400 bg-stone-100" }
    if (exceededCount > 0) return { text: `${exceededCount}개 상한 초과`, cls: "text-rose-600 bg-rose-50" }
    if (underCount > 0)    return { text: `${underCount}개 더 살펴볼 수 있어요`, cls: "text-amber-600 bg-amber-50" }
    return { text: "설계가 잘 됐어요", cls: "text-emerald-600 bg-emerald-50" }
  })()

  // Hero CTA
  const firstFocusNutrient = standardNutrients.find((n) => n.ri > 0 && n.totalAmount < n.ri)?.name ?? null
  const ctaInfo = (() => {
    if (!hasProducts) return { text: "이 시기 제품 보기", href: "/search" }
    if (exceededCount > 0 || underCount > 0) {
      const href = firstFocusNutrient
        ? `/search?nutrient=${encodeURIComponent(firstFocusNutrient)}`
        : "/search"
      return { text: "탐색 탭에서 더 살펴보기", href }
    }
    return { text: "성장 기록 보기", href: "/record" }
  })()

  return (
    <div className="h-full flex flex-col bg-[#FAFAF8]">

      {/* ── Compact 스티키 헤더 ── */}
      <div className="flex-shrink-0 bg-white border-b border-stone-100 shadow-[0_2px_12px_rgb(0,0,0,0.04)] z-20 px-5 py-3">
        <div className="flex items-center justify-between">

          {/* 앱 정체성 */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-base leading-none select-none">
              👶
            </div>
            <div>
              <h1 className="text-[13px] font-extrabold text-stone-800 leading-tight">우리아이 영양설계</h1>
              <span className="text-[10px] font-medium text-stone-400">{AGE_GROUP_LABEL[ageGroup]}</span>
            </div>
          </div>

          {/* 월령 선택 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMonthsOld(Math.max(MIN_MONTHS, monthsOld - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 font-bold text-sm active:bg-stone-200 transition-colors"
              aria-label="나이 줄이기"
            >
              −
            </button>
            <span className="text-sm font-extrabold text-orange-500 w-12 text-center tabular-nums">
              {monthsOld}개월
            </span>
            <button
              onClick={() => setMonthsOld(Math.min(MAX_MONTHS, monthsOld + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 font-bold text-sm active:bg-stone-200 transition-colors"
              aria-label="나이 늘리기"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ── 스크롤 영역 ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* 1. 맥락 제시 — Hero 브리핑 카드 */}
        <HomeHeroCard
          monthsOld={monthsOld}
          period={briefing.period}
          message={briefing.message}
          focus={briefing.focus}
          statusText={statusInfo.text}
          statusCls={statusInfo.cls}
          ctaText={ctaInfo.text}
          ctaHref={ctaInfo.href}
        />

        {/* 2. 흥미 유발 — 성장 마일스톤 */}
        <HomeGrowthBriefCard
          monthsOld={monthsOld}
          milestone={growthMilestone}
        />

        {/* 3. 핵심 가치 제시 — 오늘의 영양 현황 */}
        <HomeNutritionCard
          hasProducts={hasProducts}
          standardNutrients={standardNutrients}
          extraNutrients={extraNutrients}
          selectedProducts={selectedProducts}
          colorMap={colorMap}
          exceededCount={exceededCount}
          routineCount={routineCount}
        />

        {/* 4. 즉시 행동 유도 — 빠른 진입 */}
        <HomeQuickActions />

        {/* 5. 관리/소유감 — 설계 바구니 */}
        <HomeBasketSection
          selectedProducts={selectedProducts}
          toggleProduct={toggleProduct}
          colorMap={colorMap}
        />

      </div>
    </div>
  )
}
