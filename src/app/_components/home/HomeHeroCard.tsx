"use client"

import Link from "next/link"

type Props = {
  monthsOld: number
  period: string
  message: string
  focus: string[]
  statusText: string
  statusCls: string
  ctaText: string
  ctaHref: string
}

export default function HomeHeroCard({
  monthsOld, period, message, focus, statusText, statusCls, ctaText, ctaHref,
}: Props) {
  return (
    <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/70 border border-orange-100 p-4 shadow-sm">

      {/* 월령 + 상태 배지 */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-extrabold text-orange-600 leading-none">
          {monthsOld}개월 · {period}
        </span>
        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full leading-none ${statusCls}`}>
          {statusText}
        </span>
      </div>

      {/* 브리핑 메시지 */}
      <p className="text-[13px] font-semibold text-stone-700 leading-relaxed mb-3">
        {message}
      </p>

      {/* 영양소 칩 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {focus.map((n) => (
          <span
            key={n}
            className="text-[10px] font-extrabold text-orange-600 bg-white px-2.5 py-1 rounded-full border border-orange-200 shadow-sm"
          >
            {n}
          </span>
        ))}
      </div>

      {/* CTA */}
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-white bg-orange-400 hover:bg-orange-500 px-4 py-2 rounded-xl shadow-sm transition-colors"
      >
        {ctaText}
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  )
}
