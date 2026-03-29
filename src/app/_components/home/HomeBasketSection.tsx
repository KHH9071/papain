"use client"

import Link from "next/link"
import type { Product } from "@/lib/types"
import { CATEGORY_ICON } from "@/lib/routine_foods"

const ROUTINE_CATEGORIES = new Set(["formula", "milk", "cheese"])

// empty state용 placeholder 슬롯
const PLACEHOLDER_SLOTS = [
  { label: "분유 또는 우유", icon: "🍼", hint: "루틴 식품" },
  { label: "영양제",         icon: "💊", hint: "건강기능식품" },
]

type Props = {
  selectedProducts: Product[]
  toggleProduct: (p: Product) => void
  colorMap: Map<number, string>
}

export default function HomeBasketSection({ selectedProducts, toggleProduct, colorMap }: Props) {
  const routineProducts    = selectedProducts.filter((p) => ROUTINE_CATEGORIES.has(p.category ?? ""))
  const supplementProducts = selectedProducts.filter((p) => !ROUTINE_CATEGORIES.has(p.category ?? ""))
  const hasProducts        = selectedProducts.length > 0

  return (
    <section className="bg-white px-5 py-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          설계 바구니
        </h3>
        {hasProducts && (
          <span className="text-xs font-medium text-gray-400">
            {selectedProducts.length}개 담김
          </span>
        )}
      </div>

      {/* empty state */}
      {!hasProducts ? (
        <div>
          {/* placeholder 슬롯 */}
          <div className="flex gap-3 mb-4">
            {PLACEHOLDER_SLOTS.map(({ label, icon, hint }) => (
              <div
                key={label}
                className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl opacity-30">{icon}</span>
                <span className="text-xs font-medium text-gray-400 text-center leading-tight">{label}</span>
                <span className="text-[10px] text-gray-300">{hint}</span>
              </div>
            ))}
            {/* 추가 슬롯 암시 */}
            <div className="flex-1 border-2 border-dashed border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span className="text-[10px] font-medium text-gray-300">더 추가</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center mb-3">
            분유·우유·영양제를 담으면 여기서 한눈에 관리할 수 있어요
          </p>
          <Link
            href="/search"
            className="flex items-center justify-center gap-1.5 py-3 text-sm font-bold text-orange-600 border-2 border-dashed border-orange-200 rounded-xl hover:bg-orange-50 transition-colors"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.1" y2="16.1" />
            </svg>
            탐색에서 담기
          </Link>
        </div>
      ) : (
        /* filled state */
        <div className="flex flex-col gap-2.5">
          {/* 루틴 식품 */}
          {routineProducts.map((p) => {
            const unitLabel = p.base_unit === "ml" ? "ml" : "장"
            return (
              <div key={p.id} className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex items-center gap-3">
                <span className="text-lg shrink-0">
                  {CATEGORY_ICON[p.category as "formula" | "milk" | "cheese"] ?? "🍼"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-400">{p.manufacturer ?? ""}</p>
                  <p className="font-bold text-gray-900 text-sm truncate">{p.product_name}</p>
                  <p className="text-[11px] font-medium text-blue-600 mt-0.5">
                    하루 {p.daily_serving_count}{unitLabel}
                  </p>
                </div>
                <button
                  onClick={() => toggleProduct(p)}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                >
                  <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}

          {/* 건기식 */}
          {supplementProducts.map((p) => {
            const color = colorMap.get(p.id)
            const servingText =
              p.daily_serving_count && p.amount_per_serving && p.serving_unit
                ? `${p.daily_serving_count}회 × ${p.amount_per_serving}${p.serving_unit}`
                : null
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-400">{p.manufacturer ?? ""}</p>
                  <p className="font-bold text-gray-900 text-sm truncate">{p.product_name}</p>
                  {servingText && (
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{servingText}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleProduct(p)}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                >
                  <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}

          {/* 더 추가하기 */}
          <Link
            href="/search"
            className="flex items-center justify-center gap-1.5 py-3 text-sm font-bold text-orange-600 border-2 border-dashed border-orange-200 rounded-xl hover:bg-orange-50 transition-colors mt-1"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.1" y2="16.1" />
            </svg>
            제품 더 추가하기
          </Link>
        </div>
      )}
    </section>
  )
}
