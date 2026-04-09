"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { getAgeGroup, getRecommendedIntakes, getUpperLimits, AGE_GROUP_LABEL } from "@/lib/kdri_data"
import { getMultiplier } from "@/lib/nutrition_utils"
import { CATEGORY_ICON, CATEGORY_LABEL } from "@/lib/routine_foods"
import type { Product } from "@/lib/types"

// ── KDRI 키 기반 영양소 비교 행 생성 ──────────────────────────────────────────
type CompareRow = {
  key: string
  name: string
  unit: string
  ri: number
  ul: number | undefined
  amounts: number[]       // 제품별 일일 섭취량
  total: number
  riPcts: (number | null)[]
  totalRiPct: number | null
  isExceeded: boolean
}

function buildCompareRows(
  products: Product[],
  ri: Record<string, { ri: number }>,
  ul: Record<string, number>,
): CompareRow[] {
  const allKeys = new Set<string>()
  Object.keys(ri).forEach((k) => allKeys.add(k))
  Object.keys(ul).forEach((k) => allKeys.add(k))

  // 제품에만 있고 KDRI에 없는 영양소도 포함
  for (const p of products) {
    const mult = getMultiplier(p)
    for (const n of p.nutrients) {
      if (n.name === "비타민D" && n.unit === "IU") {
        allKeys.add("비타민D||μg")
      } else {
        allKeys.add(`${n.name}||${n.unit}`)
      }
    }
  }

  return Array.from(allKeys)
    .map((key) => {
      const [name, unit] = key.split("||")
      const riVal = ri[key]?.ri ?? 0
      const ulVal = ul[key]

      const amounts = products.map((p) => {
        const mult = getMultiplier(p)
        const n = p.nutrients.find((pn) => {
          if (name === "비타민D" && unit === "μg" && pn.name === "비타민D" && pn.unit === "IU") return true
          return pn.name === name && pn.unit === unit
        })
        if (!n) return 0
        const raw = n.amount * mult
        return n.name === "비타민D" && n.unit === "IU" ? raw / 40 : raw
      })

      const total = amounts.reduce((s, a) => s + a, 0)
      const riPcts = amounts.map((a) => (riVal > 0 ? Math.round((a / riVal) * 100) : null))
      const totalRiPct = riVal > 0 ? Math.round((total / riVal) * 100) : null
      const isExceeded = ulVal !== undefined && total > ulVal

      return { key, name, unit, ri: riVal, ul: ulVal, amounts, total, riPcts, totalRiPct, isExceeded }
    })
    // KDRI 기준이 있는 영양소를 먼저, 그 다음 나머지
    .sort((a, b) => {
      const aHas = a.ul !== undefined || a.ri > 0 ? 0 : 1
      const bHas = b.ul !== undefined || b.ri > 0 ? 0 : 1
      return aHas - bHas
    })
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function ComparePage() {
  const router = useRouter()
  const { selectedProducts, monthsOld } = useAppStore()

  const ageGroup = getAgeGroup(monthsOld)
  const ri = useMemo(() => getRecommendedIntakes(monthsOld), [monthsOld])
  const ul = useMemo(() => getUpperLimits(monthsOld), [monthsOld])

  const rows = useMemo(
    () => buildCompareRows(selectedProducts, ri, ul),
    [selectedProducts, ri, ul],
  )

  const kdriRows = rows.filter((r) => r.ul !== undefined || r.ri > 0)
  const extraRows = rows.filter((r) => r.ul === undefined && r.ri === 0 && r.total > 0)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 z-20 px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">제품 비교</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {AGE_GROUP_LABEL[ageGroup]} · {selectedProducts.length}개 제품
            </p>
          </div>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">

        {/* empty state */}
        {selectedProducts.length < 2 ? (
          <div className="flex flex-col items-center justify-center px-5 pt-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4">
              ⚖️
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">비교할 제품이 부족해요</p>
            <p className="text-xs text-gray-400 mb-6 text-center leading-relaxed">
              탐색에서 2개 이상 제품을 담으면<br />영양소를 나란히 비교할 수 있어요
            </p>
            <Link
              href="/search"
              className="px-6 py-3 bg-orange-500 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors"
            >
              제품 탐색하기
            </Link>
          </div>
        ) : (
          <>
            {/* 제품 카드 목록 */}
            <section className="bg-white px-5 py-5">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {selectedProducts.map((p) => {
                  const cat = p.category ?? "supplement"
                  const icon = CATEGORY_ICON[cat as "formula" | "milk" | "cheese"] ?? "💊"
                  return (
                    <Link
                      key={p.id}
                      href={`/product/${p.id}`}
                      className="flex-shrink-0 w-32 bg-gray-50 border border-gray-100 rounded-xl p-3 hover:border-orange-200 transition-colors"
                    >
                      <span className="text-lg">{icon}</span>
                      <p className="text-[11px] text-gray-400 font-medium mt-1.5 truncate">{p.manufacturer ?? ""}</p>
                      <p className="text-xs font-bold text-gray-800 leading-tight mt-0.5 line-clamp-2">{p.product_name}</p>
                      {p.daily_serving_count && p.base_unit && (
                        <p className="text-[10px] text-blue-500 font-medium mt-1">
                          {p.daily_serving_count}{p.base_unit === "ml" ? "ml" : p.base_unit === "장" ? "장" : "회"}/일
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* KDRI 기준 영양소 비교 테이블 */}
            {kdriRows.length > 0 && (
              <section className="bg-white mt-2 px-5 py-5">
                <p className="text-xs font-medium text-gray-400 mb-4">영양소 비교 (KDRI 기준)</p>
                <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-medium text-gray-400 pb-2 pr-2 w-16">영양소</th>
                        {selectedProducts.map((p) => (
                          <th key={p.id} className="text-right text-[11px] font-medium text-gray-400 pb-2 px-1 max-w-20">
                            <span className="block truncate">{p.product_name.slice(0, 6)}</span>
                          </th>
                        ))}
                        <th className="text-right text-[11px] font-bold text-gray-600 pb-2 pl-2 w-16 border-l border-gray-100">합계</th>
                        <th className="text-right text-[11px] font-medium text-gray-400 pb-2 pl-1 w-12">목표</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kdriRows.map((row) => (
                        <tr key={row.key} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 pr-2">
                            <span className="text-sm font-bold text-gray-700">{row.name}</span>
                            <span className="text-[10px] text-gray-400 ml-0.5">{row.unit}</span>
                          </td>
                          {row.amounts.map((amt, i) => (
                            <td key={i} className="text-right py-2.5 px-1 tabular-nums">
                              <span className="text-sm text-gray-600">{amt > 0 ? parseFloat(amt.toFixed(2)) : "—"}</span>
                              {row.riPcts[i] !== null && amt > 0 && (
                                <span className={`block text-[10px] font-medium ${
                                  row.riPcts[i]! >= 100 ? "text-emerald-500" : "text-amber-500"
                                }`}>
                                  {row.riPcts[i]}%
                                </span>
                              )}
                            </td>
                          ))}
                          <td className={`text-right py-2.5 pl-2 tabular-nums border-l border-gray-100 ${
                            row.isExceeded ? "text-red-500" : "text-gray-900"
                          }`}>
                            <span className="text-sm font-bold">{parseFloat(row.total.toFixed(2))}</span>
                            {row.totalRiPct !== null && (
                              <span className={`block text-[10px] font-bold ${
                                row.isExceeded ? "text-red-500" : row.totalRiPct >= 100 ? "text-emerald-500" : "text-amber-500"
                              }`}>
                                {row.totalRiPct}%
                              </span>
                            )}
                          </td>
                          <td className="text-right py-2.5 pl-1 tabular-nums">
                            <span className="text-[11px] text-gray-400">{row.ri > 0 ? row.ri : "—"}</span>
                            {row.ul !== undefined && (
                              <span className="block text-[10px] text-red-400">≤{row.ul}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 범례 */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    목표 충족
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    목표 미달
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    상한 초과
                  </div>
                </div>
              </section>
            )}

            {/* 기준치 미설정 영양소 */}
            {extraRows.length > 0 && (
              <section className="bg-white mt-2 px-5 py-5">
                <p className="text-xs font-medium text-gray-400 mb-3">기준치 미설정 성분</p>
                <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-medium text-gray-400 pb-2 pr-2 w-16">성분</th>
                        {selectedProducts.map((p) => (
                          <th key={p.id} className="text-right text-[11px] font-medium text-gray-400 pb-2 px-1 max-w-20">
                            <span className="block truncate">{p.product_name.slice(0, 6)}</span>
                          </th>
                        ))}
                        <th className="text-right text-[11px] font-bold text-gray-600 pb-2 pl-2 w-16 border-l border-gray-100">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraRows.map((row) => (
                        <tr key={row.key} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-2">
                            <span className="text-sm font-medium text-gray-600">{row.name}</span>
                            <span className="text-[10px] text-gray-400 ml-0.5">{row.unit}</span>
                          </td>
                          {row.amounts.map((amt, i) => (
                            <td key={i} className="text-right py-2 px-1 tabular-nums text-sm text-gray-500">
                              {amt > 0 ? parseFloat(amt.toFixed(2)) : "—"}
                            </td>
                          ))}
                          <td className="text-right py-2 pl-2 tabular-nums border-l border-gray-100 text-sm font-bold text-gray-800">
                            {parseFloat(row.total.toFixed(2))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 메타데이터 비교 — 분유/우유/치즈 제품이 있을 때만 */}
            <MetadataCompare products={selectedProducts} />
          </>
        )}
      </div>
    </div>
  )
}

// ── 메타데이터 비교 서브 컴포넌트 ─────────────────────────────────────────────
function MetadataCompare({ products }: { products: Product[] }) {
  const routineProducts = products.filter((p) =>
    p.category === "formula" || p.category === "milk" || p.category === "cheese"
  )
  if (routineProducts.length < 1) return null

  type MetaRow = { label: string; values: string[] }
  const metaRows: MetaRow[] = []

  // 카테고리
  metaRows.push({
    label: "분류",
    values: routineProducts.map((p) => CATEGORY_LABEL[p.category as "formula" | "milk" | "cheese"] ?? "—"),
  })

  // 단계
  if (routineProducts.some((p) => p.metadata?.formulaStage)) {
    metaRows.push({
      label: "단계",
      values: routineProducts.map((p) => p.metadata?.formulaStage ? `${p.metadata.formulaStage}단계` : "—"),
    })
  }

  // 적합 월령
  if (routineProducts.some((p) => p.metadata?.derivedAgeRangeMonths)) {
    metaRows.push({
      label: "적합 월령",
      values: routineProducts.map((p) => {
        const r = p.metadata?.derivedAgeRangeMonths
        return r ? `${r[0]}~${r[1]}개월` : "—"
      }),
    })
  }

  // 유기농
  if (routineProducts.some((p) => p.metadata?.isOrganic)) {
    metaRows.push({
      label: "유기농",
      values: routineProducts.map((p) => p.metadata?.isOrganic ? "유기농" : "—"),
    })
  }

  // 원유 기반
  if (routineProducts.some((p) => p.metadata?.baseAnimalType)) {
    metaRows.push({
      label: "원유 기반",
      values: routineProducts.map((p) => {
        const t = p.metadata?.baseAnimalType
        return t === "goat" ? "산양" : t === "cow" ? "소" : "—"
      }),
    })
  }

  // 알레르기
  if (routineProducts.some((p) => p.metadata?.allergens?.length)) {
    metaRows.push({
      label: "알레르기",
      values: routineProducts.map((p) => p.metadata?.allergens?.join(", ") ?? "—"),
    })
  }

  if (metaRows.length <= 1) return null // 카테고리만 있으면 굳이 보여줄 필요 없음

  return (
    <section className="bg-white mt-2 px-5 py-5">
      <p className="text-xs font-medium text-gray-400 mb-3">제품 속성 비교</p>
      <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
        <table className="w-full min-w-[360px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[11px] font-medium text-gray-400 pb-2 pr-2 w-16" />
              {routineProducts.map((p) => (
                <th key={p.id} className="text-center text-[11px] font-medium text-gray-400 pb-2 px-2 max-w-24">
                  <span className="block truncate">{p.product_name.slice(0, 8)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metaRows.map((row) => (
              <tr key={row.label} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 pr-2 text-sm font-medium text-gray-500">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="text-center py-2.5 px-2 text-sm font-bold text-gray-700">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
