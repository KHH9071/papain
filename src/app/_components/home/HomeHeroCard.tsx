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
    <section className="bg-white px-5 py-6 mb-2">

      {/* 월령 + 상태 배지 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-orange-600 tracking-wide">STAGE INSIGHT</span>
          <span className="text-gray-300">|</span>
          <span className="text-xs font-medium text-gray-600">{monthsOld}개월 · {period}</span>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-sm leading-none flex items-center gap-1 ${statusCls}`}>
          {statusText}
        </span>
      </div>

      {/* 브리핑 메시지 */}
      <h2 className="text-xl font-bold text-gray-900 leading-snug tracking-tight mb-4">
        {message}
      </h2>

      {/* 영양소 칩 */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {focus.map((n) => (
          <span
            key={n}
            className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full"
          >
            {n}
          </span>
        ))}
      </div>

      {/* CTA */}
      <Link
        href={ctaHref}
        className="flex items-center justify-center w-full py-3.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl text-sm transition-colors duration-200"
      >
        {ctaText}
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="ml-1">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </section>
  )
}
