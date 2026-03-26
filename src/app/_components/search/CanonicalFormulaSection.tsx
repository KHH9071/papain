/**
 * CanonicalFormulaSection.tsx
 *
 * canonical_product 테이블 레코드를 표시하는 분유 카탈로그 섹션.
 * Phase 4B/4C 기반 → 확장: 브랜드별 그룹핑, 국가/밀크베이스 필터, evidence 배지.
 *
 * - 기존 products 목록과 완전 분리 (섞지 않음)
 * - read-only 표시 전용. 선택/추가/삭제 기능 없음.
 * - stageFilter: SearchClient의 stageFilter 그대로 수신.
 */

"use client"

import { useState, useMemo } from "react"
import type { CanonicalProduct, CanonicalProductCountryVersion } from "@/lib/types"

// ── 표시용 레이블 ────────────────────────────────────────────────────────────

const CONFIDENCE_STYLE: Record<string, { label: string; cls: string }> = {
  high:   { label: "고신뢰", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  medium: { label: "중신뢰", cls: "bg-amber-50  text-amber-600  border-amber-100"  },
  low:    { label: "저신뢰", cls: "bg-stone-50  text-stone-400  border-stone-100"  },
}

const STAGE_LABEL: Record<string, string> = {
  PRE: "PRE", "1": "1단계", "2": "2단계", "3": "3단계", "4": "4단계",
  unknown: "미확인",
}

const MILK_LABEL: Record<string, string> = {
  cow: "소", goat: "산양", plant: "식물", unknown: "-",
}

const COUNTRY_FLAG: Record<string, string> = {
  UK: "🇬🇧", DE: "🇩🇪", US: "🇺🇸", AU: "🇦🇺", EU: "🇪🇺", KR: "🇰🇷", Unknown: "",
}

const EVIDENCE_STYLE: Record<string, { label: string; cls: string }> = {
  "Verified-A": { label: "A등급", cls: "bg-emerald-50 text-emerald-600" },
  "Verified-B": { label: "B등급", cls: "bg-blue-50 text-blue-600" },
  "Verified-C": { label: "C등급", cls: "bg-amber-50 text-amber-500" },
  "Restricted":  { label: "제한", cls: "bg-red-50 text-red-500" },
  "Unverified":  { label: "미검증", cls: "bg-stone-50 text-stone-400" },
}

// ── 단일 카드 (컴팩트) ───────────────────────────────────────────────────────

function CanonicalProductCard({ p }: { p: CanonicalProduct }) {
  const conf     = CONFIDENCE_STYLE[p.confidence_score] ?? CONFIDENCE_STYLE.low
  const stageTxt = STAGE_LABEL[p.stage] ?? p.stage
  const milkTxt  = MILK_LABEL[p.milk_base ?? "unknown"] ?? "-"
  const flag     = COUNTRY_FLAG[p.country_version] ?? ""
  const evStyle  = p.evidence_grade ? EVIDENCE_STYLE[p.evidence_grade] : null

  return (
    <div className="bg-white rounded-xl border border-stone-100 px-3 py-2.5">
      {/* 상단: 브랜드·라인 + 배지 */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <h3 className="font-extrabold text-[13px] text-stone-800 leading-tight truncate">
            {p.line && p.line !== p.brand ? `${p.line}` : p.brand}
          </h3>
          {p.age_range_text && (
            <p className="text-[9px] font-bold text-stone-400 mt-0.5">{p.age_range_text}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {evStyle && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${evStyle.cls}`}>
              {evStyle.label}
            </span>
          )}
          <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded ${conf.cls}`}>
            {conf.label}
          </span>
        </div>
      </div>

      {/* 속성 배지 */}
      <div className="flex flex-wrap gap-1">
        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
          {flag} {p.country_version}
        </span>
        <span className="text-[9px] font-bold bg-stone-50 text-stone-500 border border-stone-100 px-1.5 py-0.5 rounded">
          {stageTxt}
        </span>
        <span className="text-[9px] font-bold bg-stone-50 text-stone-500 border border-stone-100 px-1.5 py-0.5 rounded">
          {milkTxt}유
        </span>
        {p.form && p.form !== "unknown" && (
          <span className="text-[9px] font-bold bg-stone-50 text-stone-500 border border-stone-100 px-1.5 py-0.5 rounded">
            {p.form === "powder" ? "분말" : p.form === "liquid" ? "액상" : p.form}
          </span>
        )}
        {p.organic_flag && (
          <span className="text-[9px] font-bold bg-green-50 text-green-600 border border-green-100 px-1.5 py-0.5 rounded">
            유기농
          </span>
        )}
        {p.package_size_value && (
          <span className="text-[9px] font-bold bg-stone-50 text-stone-500 border border-stone-100 px-1.5 py-0.5 rounded">
            {p.package_size_value}{p.package_size_unit}
          </span>
        )}
      </div>

      {/* 출처 */}
      <p className="text-[8px] font-bold text-stone-300 mt-1.5">
        {p.source_count}개 출처 검증
      </p>
    </div>
  )
}

// ── 브랜드 그룹 ──────────────────────────────────────────────────────────────

function BrandGroup({
  brand,
  products,
  defaultExpanded,
}: {
  brand: string
  products: CanonicalProduct[]
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const countries = [...new Set(products.map(p => p.country_version))]
  const flag = COUNTRY_FLAG[countries[0]] ?? ""

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between py-1.5"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-extrabold text-stone-700">
            {flag} {brand}
          </span>
          <span className="text-[9px] font-bold text-stone-400 bg-stone-50 border border-stone-100 px-1.5 py-0.5 rounded">
            {products.length}개
          </span>
        </div>
        <svg
          width={12} height={12}
          className={`text-stone-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="flex flex-col gap-1.5 pb-2">
          {products.map(p => (
            <CanonicalProductCard key={p.canonical_product_id} p={p} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 필터 칩 ──────────────────────────────────────────────────────────────────

type FilterType = "all" | "country" | "milk"

// ── 메인 섹션 ────────────────────────────────────────────────────────────────

export default function CanonicalFormulaSection({
  products,
  stageFilter = null,
}: {
  products: CanonicalProduct[]
  stageFilter?: number | null
}) {
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [filterValue, setFilterValue] = useState<string | null>(null)

  // ── 필터 옵션 계산 ──────────────────────────────────────────────
  const { countries, milkBases } = useMemo(() => {
    const cs = new Set<string>()
    const ms = new Set<string>()
    for (const p of products) {
      cs.add(p.country_version)
      if (p.milk_base && p.milk_base !== "unknown") ms.add(p.milk_base)
    }
    return {
      countries: [...cs].sort(),
      milkBases: [...ms].sort(),
    }
  }, [products])

  // ── 필터링 적용 ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = products

    // Stage 필터
    if (stageFilter !== null) {
      result = result.filter(p => p.stage === String(stageFilter))
    }

    // 국가/밀크베이스 필터
    if (filterType === "country" && filterValue) {
      result = result.filter(p => p.country_version === filterValue)
    } else if (filterType === "milk" && filterValue) {
      result = result.filter(p => p.milk_base === filterValue)
    }

    return result
  }, [products, stageFilter, filterType, filterValue])

  // ── 브랜드별 그룹핑 ────────────────────────────────────────────
  const brandGroups = useMemo(() => {
    const groups: Record<string, CanonicalProduct[]> = {}
    for (const p of filtered) {
      groups[p.brand] = groups[p.brand] || []
      groups[p.brand].push(p)
    }
    // 제품 수 내림차순 정렬
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [filtered])

  if (filtered.length === 0) return null

  const handleFilter = (type: FilterType, value: string | null) => {
    if (filterType === type && filterValue === value) {
      setFilterType("all")
      setFilterValue(null)
    } else {
      setFilterType(type)
      setFilterValue(value)
    }
  }

  return (
    <div className="px-5 pt-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-extrabold text-stone-700">분유 카탈로그</span>
          <span className="text-[9px] font-bold bg-violet-50 text-violet-500 border border-violet-100 px-1.5 py-0.5 rounded-md">
            복수 출처 검증
          </span>
        </div>
        <span className="text-[10px] font-bold text-stone-400">{filtered.length}건</span>
      </div>

      {/* 필터 칩 */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => handleFilter("all", null)}
          className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            filterType === "all"
              ? "bg-stone-800 text-white"
              : "bg-white border border-stone-200 text-stone-500"
          }`}
        >
          전체
        </button>

        {/* 국가 필터 */}
        {countries.map(c => (
          <button
            key={c}
            onClick={() => handleFilter("country", c)}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              filterType === "country" && filterValue === c
                ? "bg-blue-500 text-white"
                : "bg-white border border-stone-200 text-stone-500"
            }`}
          >
            {COUNTRY_FLAG[c] ?? ""} {c}
          </button>
        ))}

        <span className="text-stone-200 shrink-0">|</span>

        {/* 밀크베이스 필터 */}
        {milkBases.map(m => (
          <button
            key={m}
            onClick={() => handleFilter("milk", m)}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              filterType === "milk" && filterValue === m
                ? "bg-green-500 text-white"
                : "bg-white border border-stone-200 text-stone-500"
            }`}
          >
            {MILK_LABEL[m] ?? m}유
          </button>
        ))}
      </div>

      {/* 브랜드별 그룹 */}
      <div className="flex flex-col gap-1 mb-3">
        {brandGroups.map(([brand, prods], i) => (
          <BrandGroup
            key={brand}
            brand={brand}
            products={prods}
            defaultExpanded={i < 3}
          />
        ))}
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-px bg-stone-100" />
        <span className="text-[9px] font-bold text-stone-300 shrink-0">기존 분유·루틴 제품</span>
        <div className="flex-1 h-px bg-stone-100" />
      </div>
    </div>
  )
}
