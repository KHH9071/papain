"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import { LineChart, Line, ComposedChart, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { useAppStore, type GrowthRecord } from "@/lib/store"
import { getHeightData, getWeightData, findNearestGrowthRow } from "@/lib/growth_data"
import {
  getUpperLimits,
  getRecommendedIntakes,
  getAgeGroup,
  AGE_GROUP_LABEL,
  KDRI_RI,
  KDRI_UL,
  MIN_MONTHS,
  MAX_MONTHS,
  NEXT_AGE_THRESHOLD,
} from "@/lib/kdri_data"
import type { Product } from "@/lib/types"
import { getMultiplier } from "@/lib/nutrition_utils"

// ─── 타입 ─────────────────────────────────────────────────────────────────────
type PageTab  = "growth" | "nutrition"
type NutritionView = "daily" | "trend"
type ChartTab = "height" | "weight"

type AggNutrient = { name: string; amount: number; unit: string }

type RIRow = {
  key: string; name: string; unit: string
  ri: number; current: number; pct: number
  ulVal: number | undefined; isDeficient: boolean; isExceeded: boolean
  foodSource: string
}

// ─── 영양소 합산 ──────────────────────────────────────────────────────────────
function aggregateNutrients(products: Product[]): AggNutrient[] {
  const map = new Map<string, { amount: number; unit: string }>()
  for (const p of products) {
    const mult = getMultiplier(p)
    for (const n of p.nutrients) {
      const key = `${n.name}||${n.unit}`
      const amount = parseFloat((n.amount * mult).toFixed(4))
      const ex = map.get(key)
      if (ex) ex.amount = parseFloat((ex.amount + amount).toFixed(4))
      else map.set(key, { amount, unit: n.unit })
    }
  }
  return Array.from(map.entries()).map(([k, v]) => ({ name: k.split("||")[0], ...v }))
}

function getCurrentAmount(name: string, unit: string, aggregated: AggNutrient[]): number {
  const direct = aggregated.find((n) => n.name === name && n.unit === unit)
  let amount = direct ? direct.amount : 0
  if (name === "비타민D" && unit === "μg") {
    const iu = aggregated.find((n) => n.name === "비타민D" && n.unit === "IU")
    if (iu) amount += iu.amount / 40
  }
  return amount
}

// ─── 백분위 계산 ───────────────────────────────────────────────────────────────
type PctRow = { month: number; p5: number; p50: number; p95: number }

function calcPct(value: number, row: PctRow): number {
  if (value <= row.p5)  return Math.round((value / row.p5) * 5)
  if (value <= row.p50) return Math.round(5  + ((value - row.p5)  / (row.p50 - row.p5))  * 45)
  if (value <= row.p95) return Math.round(50 + ((value - row.p50) / (row.p95 - row.p50)) * 45)
  return Math.min(99, Math.round(95 + ((value - row.p95) / (row.p95 * 0.1)) * 4))
}

function pctLabel(p: number) {
  if (p <= 5)  return "또래보다 작아요"
  if (p <= 25) return "또래보다 약간 작아요"
  if (p <= 75) return "또래 평균 수준이에요"
  if (p <= 95) return "또래보다 약간 커요"
  return "또래보다 많이 커요"
}

// ─── BMI 계산 ─────────────────────────────────────────────────────────────────
function calcBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1))
}

function bmiLabel(bmi: number, monthsOld: number): { text: string; cls: string } {
  // 간이 기준 (영유아): WHO 기준 대비 대략적 분류
  if (monthsOld <= 24) {
    if (bmi < 14) return { text: "저체중 경향", cls: "text-blue-600 bg-blue-50" }
    if (bmi <= 18) return { text: "정상 범위", cls: "text-emerald-600 bg-emerald-50" }
    return { text: "과체중 경향", cls: "text-amber-600 bg-amber-50" }
  }
  if (bmi < 13.5) return { text: "저체중 경향", cls: "text-blue-600 bg-blue-50" }
  if (bmi <= 17) return { text: "정상 범위", cls: "text-emerald-600 bg-emerald-50" }
  return { text: "과체중 경향", cls: "text-amber-600 bg-amber-50" }
}

function pctColor(p: number) {
  if (p <= 5)  return "#3b82f6"
  if (p <= 25) return "#06b6d4"
  if (p <= 75) return "#10b981"
  if (p <= 95) return "#f59e0b"
  return "#f97316"
}

// ─── 음식 브릿지 제안 데이터 ──────────────────────────────────────────────────
const FOOD_BRIDGE: Record<string, { name: string; amount: string; icon: string }[]> = {
  "칼슘": [
    { name: "우유", amount: "1컵", icon: "🥛" },
    { name: "치즈", amount: "2장", icon: "🧀" },
  ],
  "철": [
    { name: "소고기", amount: "50g", icon: "🥩" },
    { name: "시금치", amount: "한줌", icon: "🥬" },
  ],
  "아연": [
    { name: "닭고기", amount: "50g", icon: "🍗" },
    { name: "견과류", amount: "한줌", icon: "🥜" },
  ],
  "비타민D": [
    { name: "연어", amount: "30g", icon: "🍣" },
    { name: "계란", amount: "1개", icon: "🥚" },
  ],
  "비타민C": [
    { name: "딸기", amount: "6개", icon: "🍓" },
    { name: "브로콜리", amount: "30g", icon: "🥦" },
  ],
  "비타민A": [
    { name: "당근", amount: "30g", icon: "🥕" },
    { name: "고구마", amount: "30g", icon: "🍠" },
  ],
}

// ─── 영양소 추이 데이터 빌더 (실제 kdri_data 기반) ───────────────────────────
type TrendPoint = { month: number; ri: number | null; intake: number }

function buildNutrientTrendData(nutrientKey: string, currentIntake: number): TrendPoint[] {
  return Array.from({ length: MAX_MONTHS + 1 }, (_, month) => {
    const group = getAgeGroup(month)
    const riEntry = KDRI_RI[group]?.[nutrientKey]
    return {
      month,
      ri: riEntry ? riEntry.ri : null,
      intake: currentIntake,
    }
  })
}

// ─── 영양소 추이 차트 (recharts ComposedChart) ───────────────────────────────
function NutrientTrendChart({
  nutrientKey, name, unit, currentIntake, currentMonths,
}: {
  nutrientKey: string; name: string; unit: string
  currentIntake: number; currentMonths: number
}) {
  const data = useMemo(
    () => buildNutrientTrendData(nutrientKey, currentIntake),
    [nutrientKey, currentIntake],
  )

  // 현재 월령의 RI / UL
  const currentRI  = KDRI_RI[getAgeGroup(currentMonths)]?.[nutrientKey]?.ri ?? null
  const currentUL  = KDRI_UL[getAgeGroup(currentMonths)]?.[nutrientKey] ?? null
  // 다음 연령 구간의 RI (없으면 null — 마지막 구간)
  const currentAgeGroup = getAgeGroup(currentMonths)
  const nextThreshold   = NEXT_AGE_THRESHOLD[currentAgeGroup]
  const nextGroup       = nextThreshold !== null ? getAgeGroup(nextThreshold) : null
  const futureRI        = nextGroup ? (KDRI_RI[nextGroup]?.[nutrientKey]?.ri ?? null) : null
  const hasFutureGap = futureRI !== null && currentIntake < futureRI
  const isNearUL   = currentUL !== null && currentIntake >= currentUL * 0.8

  const displayCur = parseFloat(currentIntake.toFixed(2))

  // Y축 범위: ri 최대값과 intake 중 큰 값 기준으로 여유 확보
  const maxRI = Math.max(...data.filter((d) => d.ri !== null).map((d) => d.ri as number))
  const yMax  = Math.max(maxRI, currentIntake) * 1.35

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-extrabold text-gray-800 text-sm">
          {name}
          <span className="text-gray-400 text-xs font-medium ml-1.5">성장 추이</span>
        </h3>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">단위: {unit}</span>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <svg width={22} height={8}><line x1="0" y1="4" x2="22" y2="4" stroke="#10b981" strokeWidth="2" strokeDasharray="5 3" /></svg>
          <span className="text-[10px] font-bold text-emerald-600">목표량 (RI)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width={22} height={8}><line x1="0" y1="4" x2="22" y2="4" stroke="#f97316" strokeWidth="2.5" /></svg>
          <span className="text-[10px] font-bold text-orange-500">현재 섭취량 유지</span>
        </div>
      </div>

      {/* 차트 */}
      <div className="overflow-x-auto -mx-2 px-1">
        <ComposedChart
          width={340} height={160} data={data}
          margin={{ top: 8, right: 12, left: -18, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, MAX_MONTHS]}
            ticks={[0, 12, 24, 36, 48, 60, 72, 84]}
            tick={{ fontSize: 9, fill: "#9ca3af", fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            label={{ value: "월령(개월)", position: "insideBottomRight", offset: -4, fontSize: 9, fill: "#9ca3af" }}
            height={28}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 9, fill: "#9ca3af", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const ri  = payload.find((p) => p.dataKey === "ri")?.value
              const intake = payload.find((p) => p.dataKey === "intake")?.value
              return (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[110px]">
                  <p className="font-extrabold text-gray-600 mb-1">{label}개월</p>
                  {ri != null && <p className="font-bold text-emerald-600">목표량: {ri}{unit}</p>}
                  <p className="font-bold text-orange-500">섭취량: {typeof intake === "number" ? parseFloat(intake.toFixed(2)) : "-"}{unit}</p>
                </div>
              )
            }}
          />

          {/* 현재 월령 구분선 */}
          <ReferenceLine
            x={currentMonths}
            stroke="#f97316"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: "현재", position: "top", fontSize: 9, fill: "#f97316", fontWeight: "bold" }}
          />

          {/* RI 선: 계단식 점선 (실제 kdri_data) */}
          <Line
            dataKey="ri"
            name="목표량"
            type="stepAfter"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 1.5 }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* 섭취량 선: 수평 실선 (현재 selectedProducts 합산 고정값) */}
          <Line
            dataKey="intake"
            name="섭취량"
            type="linear"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </div>

      {/* 현재 상태 요약 */}
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-gray-400">
          현재 섭취: <span className="text-orange-500">{displayCur}{unit}</span>
          {currentRI !== null && (
            <span className="ml-1">/ 목표 <span className="text-emerald-600">{currentRI}{unit}</span></span>
          )}
          {currentUL !== null && (
            <span className="ml-1">/ 상한 <span className="text-rose-400">{currentUL}{unit}</span></span>
          )}
        </span>
        {currentRI !== null && currentIntake >= currentRI && !isNearUL && (
          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ 현재 충족</span>
        )}
        {isNearUL && (
          <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">⚠ 상한 근접</span>
        )}
      </div>

      {/* 미래 Gap 경고 */}
      {hasFutureGap && (
        <div className="mt-2 bg-orange-50 border border-orange-100 p-2.5 rounded-xl flex items-start gap-2">
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px] text-gray-600 leading-snug">
            {nextThreshold}개월 이후 {name} 목표량(<strong className="text-emerald-600">{futureRI}{unit}</strong>)이 높아질 수 있어요. 건기식 조합을 미리 살펴보세요.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── 식이 브릿지 바 (영양 리포트 핵심 컴포넌트) ────────────────────────────────
function DietaryBridgeBar({ row }: { row: RIRow }) {
  const { name, unit, ri, current, pct, isDeficient, isExceeded, ulVal } = row
  const displayUnit = unit
  const displayCur  = parseFloat(current.toFixed(2))
  const solidPct    = Math.min(100, Math.max(0, pct))
  const foods       = FOOD_BRIDGE[name] ?? []

  if (isExceeded) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end px-0.5">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-800 text-sm">{name}</span>
            <span className="bg-rose-100 text-rose-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md">상한 초과</span>
          </div>
          <div className="text-xs font-bold">
            <span className="text-rose-600 text-sm">{displayCur}</span>
            <span className="text-gray-400 text-[10px] ml-0.5">/ 목표 {ri} · 상한 {ulVal}{displayUnit}</span>
          </div>
        </div>
        <div className="w-full h-12 bg-rose-500 rounded-xl flex items-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)" }} />
          <span className="relative z-10 text-white text-xs font-extrabold tracking-wide">상한 섭취량(UL) 초과 — 복용량 조절을 살펴보세요</span>
        </div>
      </div>
    )
  }

  const isMet = !isDeficient

  return (
    <div className="flex flex-col gap-2">
      {/* 헤더 */}
      <div className="flex justify-between items-end px-0.5">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-gray-800 text-sm">{name}</span>
          {isMet && (
            <span className="bg-emerald-100 text-emerald-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              충족
            </span>
          )}
        </div>
        <div className="text-xs font-bold">
          <span className={`text-sm ${isMet ? "text-emerald-600" : "text-gray-800"}`}>{displayCur}</span>
          <span className="text-gray-400 text-[10px] ml-0.5">/ 목표 {ri}{displayUnit}</span>
          {ulVal !== undefined && (
            <span className="text-gray-300 text-[10px] ml-1">· 상한 {ulVal}</span>
          )}
        </div>
      </div>

      {/* 식이 브릿지 바 */}
      <div className="w-full h-12 relative flex items-center">
        <div className="absolute inset-0 bg-gray-100 rounded-xl overflow-hidden" />

        {/* 건기식 (실선, 채워진 부분) */}
        {solidPct > 0 && (
          <div
            className={`absolute left-0 top-0 bottom-0 rounded-xl flex items-center justify-end px-2 transition-all duration-700 ease-out ${isMet ? "bg-emerald-500" : "bg-orange-400"}`}
            style={{ width: `${solidPct}%` }}
          >
            {solidPct > 18 && (
              <span className="text-white/90 text-[10px] font-bold flex items-center gap-0.5">
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></svg>
                건기식
              </span>
            )}
          </div>
        )}

        {/* 식단으로 채워야 할 부분 (점선, 음식 칩) */}
        {!isMet && (
          <div
            className="absolute right-0 top-0 bottom-0 rounded-r-xl border-2 border-dashed border-gray-300 bg-gray-50/60 flex items-center px-2 gap-1.5 overflow-hidden"
            style={{ width: `${100 - solidPct}%` }}
          >
            {100 - solidPct > 30 && (
              <span className="text-[9px] font-bold text-gray-400 shrink-0 flex items-center gap-0.5">
                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
                식단
              </span>
            )}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {foods.map((food, idx) => (
                <div key={idx} className="flex items-center bg-white border border-gray-200 rounded-lg px-1.5 py-1 shrink-0 shadow-sm">
                  <span className="text-sm mr-0.5">{food.icon}</span>
                  <span className="text-[10px] font-extrabold text-gray-700 whitespace-nowrap">
                    {food.name} <span className="text-orange-500">{food.amount}</span>
                  </span>
                </div>
              ))}
              {foods.length === 0 && (
                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">일반 식사로 섭취</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 부족 안내 메시지 */}
      {isDeficient && (
        <p className="text-[11px] font-medium text-gray-500 px-0.5 leading-snug">
          건기식으로 <strong className="text-orange-500">{parseFloat((ri - current).toFixed(2))}{displayUnit}</strong>만큼 더 살펴볼 수 있어요. 위 식품을 통해서도 채울 수 있어요.
        </p>
      )}
    </div>
  )
}

// ─── 성장 백분위 바 ────────────────────────────────────────────────────────────
function PercentileBar({ value, row, label }: { value: number; row: PctRow; label: string }) {
  const pct   = calcPct(value, row)
  const color = pctColor(pct)
  const pos   = Math.min(98, Math.max(2, pct))
  return (
    <div className="flex-1">
      <div className="flex items-end justify-between mb-1">
        <span className="text-[10px] font-bold text-gray-400">{label}</span>
        <span className="text-base font-extrabold" style={{ color }}>
          {value}{label === "키" ? "cm" : "kg"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + "20", color }}>
          P{pct}
        </span>
        <span className="text-[10px] font-bold text-gray-500">{pctLabel(pct)}</span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full">
        <div className="absolute top-0 h-full rounded-full opacity-20" style={{ left: "15%", width: "70%", backgroundColor: "#10b981" }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md" style={{ left: `calc(${pos}% - 6px)`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-300 font-bold" style={{ marginLeft: "15%" }}>P5</span>
        <span className="text-[9px] text-gray-300 font-bold" style={{ marginRight: "16%" }}>P95</span>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label, tab }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number; tab: ChartTab
}) {
  if (!active || !payload?.length) return null
  const unit  = tab === "height" ? "cm" : "kg"
  const child = payload.find((p) => p.name === "내아이")
  const refs  = payload.filter((p) => p.name !== "내아이")
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-[110px]">
      <p className="font-extrabold text-gray-600 mb-1.5">{label}개월</p>
      {child && <p className="font-extrabold text-emerald-600 text-sm mb-1">내 아이: {child.value}{unit}</p>}
      {refs.map((p, i) => <p key={i} className="text-gray-400 font-bold leading-relaxed">{p.name}: {p.value}{unit}</p>)}
    </div>
  )
}

// ─── 주간 캘린더 데이터 생성 ──────────────────────────────────────────────────
function getWeekDays(hasDataToday: boolean) {
  const today      = new Date()
  const dayOfWeek  = today.getDay()
  const monday     = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const labels = ["월", "화", "수", "목", "금", "토", "일"]
  return Array.from({ length: 7 }, (_, i) => {
    const d       = new Date(monday)
    d.setDate(monday.getDate() + i)
    const isToday = d.toDateString() === today.toDateString()
    return {
      id:      isToday ? "today" : `day-${i}`,
      label:   isToday ? "오늘" : labels[i],
      date:    d.getDate(),
      hasData: isToday && hasDataToday,
      isToday,
    }
  })
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function RecordPage() {
  const {
    gender: storeGender, setGender: setStoreGender,
    monthsOld: storeMonthsOld,
    selectedProducts,
    growthRecords, addGrowthRecord, removeGrowthRecord,
  } = useAppStore()

  // 수정 버튼 클릭 시 폼으로 스크롤
  const formRef = useRef<HTMLDivElement>(null)

  // ── 전역 설정 ─────────────────────────────────────────────────────────────
  const [pageTab, setPageTab]         = useState<PageTab>("growth")
  const [nutritionView, setNutritionView] = useState<NutritionView>("daily")
  const [selectedDay, setSelectedDay] = useState("today")
  const [localGender, setLocalGender] = useState<"M" | "F">(storeGender)
  const [localMonths, setLocalMonths] = useState(storeMonthsOld)
  const [monthInput, setMonthInput]   = useState(String(storeMonthsOld))

  // ── 성장 탭 전용 ──────────────────────────────────────────────────────────
  const [chartTab, setChartTab]       = useState<ChartTab>("height")
  const [heightInput, setHeightInput] = useState("")
  const [weightInput, setWeightInput] = useState("")
  const [errors, setErrors]           = useState<{ height?: string; weight?: string }>({})
  // 현재 localMonths에 이미 저장된 기록이 있으면 "수정 모드" 안내
  const existingRecord = growthRecords.find((r) => r.monthsOld === localMonths) ?? null

  // ── 데이터 ────────────────────────────────────────────────────────────────
  const heightData = getHeightData(localGender)
  const weightData = getWeightData(localGender)

  function handleGender(g: "M" | "F") {
    setLocalGender(g)
    setStoreGender(g)
  }

  function commitMonth(raw: string) {
    const v = parseInt(raw)
    const c = isNaN(v) ? localMonths : Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, v))
    setLocalMonths(c)
    setMonthInput(String(c))
  }

  // ── 성장 차트 데이터 ─────────────────────────────────────────────────────
  // 37~84개월처럼 6개월 간격 구간에서도 아이 기록 점이 차트에 표시되도록
  // 참조 데이터 외 월령의 기록을 extra 포인트로 추가하고, 참조 곡선은 connectNulls로 이어 줌
  type ChartPoint = { month: number; p5: number | null; p50: number | null; p95: number | null; 내아이: number | null }
  const chartData = useMemo<ChartPoint[]>(() => {
    const ref = chartTab === "height" ? heightData : weightData
    const refMonths = new Set(ref.map((r) => r.month))

    const refPoints: ChartPoint[] = ref.map((row) => {
      const rec = growthRecords.find((r) => r.monthsOld === row.month)
      return {
        month: row.month, p5: row.p5, p50: row.p50, p95: row.p95,
        내아이: rec ? (chartTab === "height" ? rec.height : rec.weight) : null,
      }
    })

    // 참조 데이터에 없는 월령(예: 37~41개월)에 기록된 데이터를 별도 포인트로 추가
    const extraPoints: ChartPoint[] = growthRecords
      .filter((r) => !refMonths.has(r.monthsOld))
      .map((r) => ({
        month: r.monthsOld,
        p5: null, p50: null, p95: null,
        내아이: chartTab === "height" ? r.height : r.weight,
      }))

    return [...refPoints, ...extraPoints].sort((a, b) => a.month - b.month)
  }, [chartTab, heightData, weightData, growthRecords])

  // ── 성장 기록 입력 ────────────────────────────────────────────────────────
  function validate() {
    const errs: typeof errors = {}
    const h = parseFloat(heightInput), w = parseFloat(weightInput)
    if (!heightInput || isNaN(h))  errs.height = "키를 입력해 주세요."
    else if (h < 30 || h > 160)   errs.height = "30~160cm 범위로 입력해 주세요."
    if (!weightInput || isNaN(w))  errs.weight = "체중을 입력해 주세요."
    else if (w < 1 || w > 40)     errs.weight = "1~40kg 범위로 입력해 주세요."
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    addGrowthRecord({
      date: new Date().toISOString().slice(0, 10),
      height: parseFloat(parseFloat(heightInput).toFixed(1)),
      weight: parseFloat(parseFloat(weightInput).toFixed(2)),
      monthsOld: localMonths,
    })
    setHeightInput(""); setWeightInput(""); setErrors({})
  }

  // 목록의 "수정" 버튼 → 해당 기록 값을 폼에 채우고 폼으로 스크롤
  function startEdit(r: GrowthRecord) {
    setLocalMonths(r.monthsOld)
    setMonthInput(String(r.monthsOld))
    setHeightInput(String(r.height))
    setWeightInput(String(r.weight))
    setErrors({})
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // ── 최신 기록 + 백분위 ────────────────────────────────────────────────────
  // 37~84개월 구간은 6개월 간격 데이터만 있으므로 nearest-match 사용
  const latestRecord  = growthRecords.length > 0 ? growthRecords[growthRecords.length - 1] : null
  const latestHMatch  = latestRecord ? findNearestGrowthRow(heightData, latestRecord.monthsOld) : null
  const latestWMatch  = latestRecord ? findNearestGrowthRow(weightData, latestRecord.monthsOld) : null
  const latestHRow    = latestHMatch?.row ?? null
  const latestWRow    = latestWMatch?.row ?? null
  const latestIsApprox = latestHMatch !== null && !latestHMatch.exact

  // ── 영양 리포트 데이터 ────────────────────────────────────────────────────
  const aggregated = useMemo(() => aggregateNutrients(selectedProducts), [selectedProducts])
  const riData     = getRecommendedIntakes(localMonths)
  const ulData     = getUpperLimits(localMonths)
  const ageGroup   = getAgeGroup(localMonths)

  const riRows: RIRow[] = useMemo(() => {
    return Object.entries(riData).map(([key, entry]) => {
      const [name, unit] = key.split("||")
      const current = parseFloat(getCurrentAmount(name, unit, aggregated).toFixed(4))
      const pct     = entry.ri > 0 ? (current / entry.ri) * 100 : 0
      const ulVal   = ulData[key]
      return {
        key, name, unit,
        ri: entry.ri, current,
        pct: parseFloat(pct.toFixed(1)),
        ulVal,
        isDeficient: current < entry.ri,
        isExceeded:  ulVal !== undefined && current > ulVal,
        foodSource:  entry.foodSource,
      }
    })
  }, [riData, ulData, aggregated])

  const exceededRows   = riRows.filter((r) => r.isExceeded)
  const deficientRows  = riRows.filter((r) => r.isDeficient && !r.isExceeded)
  const firstDeficientNutrient = deficientRows[0]?.name ?? null

  // ── 주간 캘린더 ───────────────────────────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(selectedProducts.length > 0), [selectedProducts.length])

  // 오늘이 아닌 날 선택 시 빈 상태
  const isViewingToday = selectedDay === "today"

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-gray-50">

      {/* ══ 스티키 헤더 ══ */}
      <div className="sticky top-0 z-10 bg-white shadow-[0_4px_16px_rgb(0,0,0,0.05)] rounded-b-3xl">

        {/* 타이틀 행 */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="20" x2="6" y2="14" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="10" />
              </svg>
            </div>
            <h1 className="text-base font-extrabold text-gray-800">기록</h1>
          </div>

          {/* 성별 + 월령 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
              <button onClick={() => handleGender("M")} aria-label="남아 선택" aria-pressed={localGender === "M"} className={`px-2.5 py-1 rounded-[10px] text-xs font-extrabold transition-colors ${localGender === "M" ? "bg-blue-500 text-white shadow-sm" : "text-gray-400"}`}>남아</button>
              <button onClick={() => handleGender("F")} aria-label="여아 선택" aria-pressed={localGender === "F"} className={`px-2.5 py-1 rounded-[10px] text-xs font-extrabold transition-colors ${localGender === "F" ? "bg-rose-400 text-white shadow-sm" : "text-gray-400"}`}>여아</button>
            </div>
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
              <button onClick={() => { const n = Math.max(MIN_MONTHS, localMonths - 1); setLocalMonths(n); setMonthInput(String(n)) }} aria-label="월령 줄이기" className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold text-base leading-none">-</button>
              <div className="flex items-center">
                <input
                  type="number" inputMode="numeric" value={monthInput}
                  onChange={(e) => setMonthInput(e.target.value)}
                  onBlur={() => commitMonth(monthInput)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
                  className="w-6 text-sm font-extrabold text-orange-600 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm font-extrabold text-orange-600">개월</span>
              </div>
              <button onClick={() => { const n = Math.min(MAX_MONTHS, localMonths + 1); setLocalMonths(n); setMonthInput(String(n)) }} aria-label="월령 늘리기" className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold text-base leading-none">+</button>
            </div>
          </div>
        </div>

        {/* 페이지 탭 */}
        <div className="px-5 pb-3">
          <div className="flex bg-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setPageTab("growth")}
              aria-pressed={pageTab === "growth"}
              className={`flex-1 py-2 rounded-xl text-sm font-extrabold transition-all ${pageTab === "growth" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
            >
              성장 기록
            </button>
            <button
              onClick={() => setPageTab("nutrition")}
              aria-pressed={pageTab === "nutrition"}
              className={`flex-1 py-2 rounded-xl text-sm font-extrabold transition-all ${pageTab === "nutrition" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
            >
              영양 리포트
            </button>
          </div>
        </div>
      </div>

      {/* ══ 콘텐츠 영역 ══ */}
      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ────────────────── Sub 1: 성장 기록 ────────────────── */}
        {pageTab === "growth" && (
          <>
            {latestRecord && latestHRow && latestWRow && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 pt-4 pb-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-extrabold text-gray-600">최근 측정 결과</h2>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                    {latestRecord.monthsOld}개월 · {latestRecord.date}
                    {latestIsApprox && <span className="text-gray-300 ml-1">· 참고 기준</span>}
                  </span>
                </div>
                <div className="flex gap-5">
                  <PercentileBar value={latestRecord.height} row={latestHRow} label="키" />
                  <div className="w-px bg-gray-100" />
                  <PercentileBar value={latestRecord.weight} row={latestWRow} label="체중" />
                </div>
                {/* BMI */}
                {latestRecord && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-400">BMI</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-gray-800">
                        {calcBMI(latestRecord.height, latestRecord.weight)}
                      </span>
                      {(() => {
                        const bmi = calcBMI(latestRecord.height, latestRecord.weight)
                        const info = bmiLabel(bmi, latestRecord.monthsOld)
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${info.cls}`}>
                            {info.text}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                )}
                {latestIsApprox && latestHMatch && (
                  <p className="text-[10px] text-gray-400 text-center mt-2">
                    * {latestHMatch.nearestMonth}개월 기준 참고 곡선이에요
                  </p>
                )}
              </div>
            )}

            <div ref={formRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-gray-700">
                  {existingRecord ? `${localMonths}개월 기록 수정` : `${localMonths}개월 기록 추가`}
                </h2>
                {existingRecord && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    저장 시 기존 기록 덮어씌우기
                  </span>
                )}
              </div>
              {/* 기록 대상 월령과 현재 기준 월령이 다를 때 안내 */}
              {localMonths !== storeMonthsOld && (
                <p className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 leading-snug">
                  현재 기준 <span className="text-orange-500">{storeMonthsOld}개월</span>과 다른 월령으로 기록해요 — Home · 탐색 기준은 바뀌지 않아요
                </p>
              )}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">키 (cm)</label>
                  <input type="number" inputMode="decimal" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} placeholder="예: 75.0"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none transition-colors ${errors.height ? "border-rose-400 bg-rose-50" : "border-gray-200 focus:border-orange-400"}`} />
                  {errors.height && <p className="text-[10px] text-rose-500 font-bold">{errors.height}</p>}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500">체중 (kg)</label>
                  <input type="number" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="예: 9.5"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none transition-colors ${errors.weight ? "border-rose-400 bg-rose-50" : "border-gray-200 focus:border-orange-400"}`} />
                  {errors.weight && <p className="text-[10px] text-rose-500 font-bold">{errors.weight}</p>}
                </div>
              </div>
              <button onClick={handleSubmit} className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-extrabold rounded-xl text-sm transition-colors">
                {existingRecord ? "수정하기" : "기록하기"}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <button onClick={() => setChartTab("height")} aria-pressed={chartTab === "height"} className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-colors ${chartTab === "height" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}>키 성장곡선</button>
                <button onClick={() => setChartTab("weight")} aria-pressed={chartTab === "weight"} className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-colors ${chartTab === "weight" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}>체중 성장곡선</button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><svg width={22} height={8}><line x1="0" y1="4" x2="22" y2="4" stroke="#d1d5db" strokeWidth="2" strokeDasharray="4 3" /></svg><span className="text-[10px] font-bold text-gray-400">P5 · P50 · P95</span></div>
                <div className="flex items-center gap-1.5"><svg width={22} height={8}><line x1="0" y1="4" x2="22" y2="4" stroke="#10b981" strokeWidth="2.5" /></svg><span className="text-[10px] font-bold text-emerald-600">우리 아이</span></div>
              </div>
              <div className="overflow-x-auto -mx-4 px-2">
                <LineChart width={760} height={248} data={chartData} margin={{ top: 6, right: 16, left: -12, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 600 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} ticks={[0, 12, 24, 36, 48, 60, 72, 84]} label={{ value: "월령(개월)", position: "insideBottom", offset: -6, fontSize: 10, fill: "#9ca3af" }} height={38} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 600 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip tab={chartTab} />} />
                  <Line dataKey="p5"  name="P5"  stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
                  <Line dataKey="p50" name="P50" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
                  <Line dataKey="p95" name="P95" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
                  <Line dataKey="내아이" name="내아이" stroke="#10b981" strokeWidth={2.5} connectNulls={false}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (payload["내아이"] == null) return <g key={`d-${payload.month}`} />
                      return <circle key={`d-${payload.month}`} cx={cx} cy={cy} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />
                    }}
                    activeDot={{ r: 7, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </div>
            </div>

            {growthRecords.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                <h2 className="text-sm font-extrabold text-gray-700">측정 기록</h2>
                <div className="flex flex-col gap-2">
                  {[...growthRecords].reverse().map((r, idx, reversed) => {
                    const hMatch  = findNearestGrowthRow(heightData, r.monthsOld)
                    const wMatch  = findNearestGrowthRow(weightData, r.monthsOld)
                    const hPct    = hMatch ? calcPct(r.height, hMatch.row) : null
                    const wPct    = wMatch ? calcPct(r.weight, wMatch.row) : null
                    const isApprox = hMatch !== null && !hMatch.exact
                    const isEditing = localMonths === r.monthsOld && heightInput !== ""
                    // 이전 기록 대비 변화량 (reversed 순서이므로 다음 인덱스가 이전 기록)
                    const prevRecord = idx < reversed.length - 1 ? reversed[idx + 1] : null
                    const heightDelta = prevRecord ? parseFloat((r.height - prevRecord.height).toFixed(1)) : null
                    const weightDelta = prevRecord ? parseFloat((r.weight - prevRecord.weight).toFixed(2)) : null
                    return (
                      <div key={r.monthsOld} className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${isEditing ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-extrabold">{r.monthsOld}m</div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400">{r.date}</p>
                            <p className="text-sm font-extrabold text-gray-800">{r.height}cm · {r.weight}kg</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {hPct !== null && wPct !== null && (
                                <span className="text-[10px] font-bold text-gray-400">
                                  키 <span style={{ color: pctColor(hPct) }}>P{hPct}</span>
                                  {" · "}체중 <span style={{ color: pctColor(wPct) }}>P{wPct}</span>
                                  {isApprox && <span className="text-gray-300 ml-1">(참고)</span>}
                                </span>
                              )}
                              {heightDelta !== null && weightDelta !== null && (
                                <span className="text-[10px] font-bold text-blue-500">
                                  {heightDelta > 0 ? "+" : ""}{heightDelta}cm {weightDelta > 0 ? "+" : ""}{weightDelta}kg
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(r)}
                            aria-label={`${r.monthsOld}개월 기록 수정`}
                            className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => removeGrowthRecord(r.monthsOld)}
                            aria-label={`${r.monthsOld}개월 기록 삭제`}
                            className="p-1.5 rounded-full text-gray-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                          >
                            <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <svg className="mx-auto mb-2 opacity-40" width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="20" x2="6" y2="14" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="10" />
                </svg>
                <p className="text-sm font-bold">아직 기록이 없어요</p>
                <p className="text-xs mt-1">위에서 키와 체중을 입력해 보세요.</p>
              </div>
            )}

            <button
              onClick={() => setPageTab("nutrition")}
              className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 text-left"
            >
              <div>
                <p className="text-xs font-extrabold text-amber-700">💡 건기식이 성장에 충분한지 확인해보세요</p>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">목표량 대비 현재 섭취 현황 살펴보기</p>
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}

        {/* ────────────────── Sub 2: 영양 리포트 ────────────────── */}
        {pageTab === "nutrition" && (
          <>
            {/* ⓪ 달성률 요약 */}
            {selectedProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-gray-600">영양 달성 현황</span>
                  <span className="text-[10px] font-bold text-gray-400">
                    건기식 {selectedProducts.length}개 기준
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className={`flex-1 rounded-xl px-3 py-2.5 text-center ${exceededRows.length > 0 ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
                    <p className={`text-lg font-extrabold ${exceededRows.length > 0 ? "text-red-600" : "text-gray-300"}`}>
                      {exceededRows.length}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">상한 초과</p>
                  </div>
                  <div className={`flex-1 rounded-xl px-3 py-2.5 text-center ${deficientRows.length > 0 ? "bg-amber-50 border border-amber-100" : "bg-gray-50"}`}>
                    <p className={`text-lg font-extrabold ${deficientRows.length > 0 ? "text-amber-600" : "text-gray-300"}`}>
                      {deficientRows.length}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">목표 미달</p>
                  </div>
                  <div className="flex-1 rounded-xl px-3 py-2.5 text-center bg-emerald-50 border border-emerald-100">
                    <p className="text-lg font-extrabold text-emerald-600">
                      {riRows.filter((r) => !r.isDeficient && !r.isExceeded).length}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">목표 충족</p>
                  </div>
                </div>
              </div>
            )}

            {/* ① 뷰 전환 세그먼티드 컨트롤 */}
            <div className="flex bg-gray-100 rounded-2xl p-1">
              <button
                onClick={() => setNutritionView("daily")}
                aria-pressed={nutritionView === "daily"}
                className={`flex-1 py-2 rounded-xl text-sm font-extrabold transition-all flex justify-center items-center gap-1.5 ${nutritionView === "daily" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                일간 채움
              </button>
              <button
                onClick={() => setNutritionView("trend")}
                aria-pressed={nutritionView === "trend"}
                className={`flex-1 py-2 rounded-xl text-sm font-extrabold transition-all flex justify-center items-center gap-1.5 ${nutritionView === "trend" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                성장 추이
              </button>
            </div>

            {/* ════ 일간 채움 뷰 ════ */}
            {nutritionView === "daily" && (
              <>
                {/* ② 주간 캘린더 */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-xs font-extrabold text-gray-600">이번 주 영양 채움</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                      {AGE_GROUP_LABEL[ageGroup]} · 건기식 {selectedProducts.length}개
                    </span>
                  </div>
                  <div className="flex justify-between items-end gap-1">
                    {weekDays.map((day) => {
                      const isSelected = selectedDay === day.id
                      return (
                        <button
                          key={day.id}
                          onClick={() => setSelectedDay(day.id)}
                          className={`flex flex-col items-center p-2 rounded-2xl w-[13%] transition-all ${
                            isSelected ? "bg-orange-500 text-white shadow-md scale-105" : "bg-transparent text-gray-500"
                          }`}
                        >
                          <span className={`text-[10px] font-bold mb-1 ${isSelected ? "text-orange-100" : "text-gray-400"}`}>{day.label}</span>
                          <span className={`text-sm font-extrabold ${isSelected ? "text-white" : "text-gray-800"}`}>{day.date}</span>
                          <div className={`w-1 h-1 rounded-full mt-1.5 ${isSelected ? "bg-white" : day.hasData ? "bg-orange-400" : "bg-transparent"}`} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ③ UL 초과 경고 */}
                {isViewingToday && exceededRows.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span className="text-sm font-extrabold text-red-700">상한 섭취량(UL) 초과 경고</span>
                    </div>
                    {exceededRows.map((r) => (
                      <div key={r.key} className="bg-red-100 rounded-xl px-3 py-2.5">
                        <p className="text-xs font-extrabold text-red-800">
                          {r.name}이(가) 상한({r.ulVal}{r.unit})을 초과했습니다!
                        </p>
                        <p className="text-[11px] text-red-600 font-medium mt-0.5">
                          현재 {parseFloat(r.current.toFixed(2))}{r.unit} 설계 중 — 복용량 조절을 살펴보세요.
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ④ 식이 브릿지 시각화 */}
                {isViewingToday ? (
                  selectedProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                      <svg className="mx-auto mb-3 opacity-40" width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" />
                      </svg>
                      <p className="text-sm font-bold">선택된 건기식이 없어요</p>
                      <p className="text-xs mt-1 font-medium">홈 탭에서 건기식을 담아주세요.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-6">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-orange-400" />
                          <span className="text-[10px] font-bold text-gray-500">건기식 채움</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm border-2 border-dashed border-gray-300 bg-gray-50" />
                          <span className="text-[10px] font-bold text-gray-500">식단으로 채울 수 있어요</span>
                        </div>
                      </div>
                      {riRows.map((row) => (
                        <DietaryBridgeBar key={row.key} row={row} />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                    <svg className="mx-auto mb-3 opacity-40" width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <p className="text-sm font-bold">이 날의 기록이 없어요</p>
                    <p className="text-xs mt-1 font-medium">오늘을 선택하면 현재 건기식 섭취 현황을 볼 수 있어요.</p>
                  </div>
                )}

                {/* 충족 영양소 요약 태그 */}
                {isViewingToday && selectedProducts.length > 0 && riRows.filter((r) => !r.isDeficient && !r.isExceeded).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {riRows.filter((r) => !r.isDeficient && !r.isExceeded).map((r) => (
                      <span key={r.key} className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        ✓ {r.name} 충족
                      </span>
                    ))}
                  </div>
                )}

                {/* Search 연결 CTA — 부족 영양소가 있을 때 탐색으로 자연스럽게 이어지도록 */}
                {isViewingToday && selectedProducts.length > 0 && deficientRows.length > 0 && (
                  <Link
                    href={firstDeficientNutrient ? `/search?nutrient=${encodeURIComponent(firstDeficientNutrient)}` : "/search"}
                    className="w-full flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3.5"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-orange-700">다른 제품이 궁금하다면</p>
                      <p className="text-[11px] text-orange-600 font-medium mt-0.5">
                        {firstDeficientNutrient
                          ? `${firstDeficientNutrient} 포함 제품 탐색하기`
                          : "탐색 탭에서 비교해보기"}
                      </p>
                    </div>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                )}
              </>
            )}

            {/* ════ 성장 추이 뷰 ════ */}
            {nutritionView === "trend" && (
              <>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-[11px] text-amber-700 font-medium leading-snug">
                    현재 건기식 조합을 유지할 경우, 아이 성장에 따른 목표량(RI) 변화를 함께 살펴볼 수 있어요.
                  </p>
                </div>
                {riRows.map((row) => (
                  <NutrientTrendChart
                    key={row.key}
                    nutrientKey={row.key}
                    name={row.name}
                    unit={row.unit}
                    currentIntake={row.current}
                    currentMonths={localMonths}
                  />
                ))}
              </>
            )}

            {/* 크로스 네비게이션 */}
            <button
              onClick={() => setPageTab("growth")}
              className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5 text-left"
            >
              <div>
                <p className="text-xs font-extrabold text-emerald-700">📈 성장 차트도 함께 확인해보세요</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">키·체중 백분위 추이 기록</p>
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>

            {/* Search 연결 CTA — 추이에서 살펴볼 것이 있을 때 */}
            {deficientRows.length > 0 && (
              <Link
                href={firstDeficientNutrient ? `/search?nutrient=${encodeURIComponent(firstDeficientNutrient)}` : "/search"}
                className="w-full flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3.5"
              >
                <div>
                  <p className="text-xs font-extrabold text-orange-700">다른 제품이 궁금하다면</p>
                  <p className="text-[11px] text-orange-600 font-medium mt-0.5">
                    {firstDeficientNutrient
                      ? `${firstDeficientNutrient} 포함 제품 탐색하기`
                      : "탐색 탭에서 비교해보기"}
                  </p>
                </div>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
