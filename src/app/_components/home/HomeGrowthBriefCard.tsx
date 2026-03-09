"use client"

import Link from "next/link"
import type { GrowthBrief } from "@/lib/home_briefs"

type Props = {
  brief: GrowthBrief
}

export default function HomeGrowthBriefCard({ brief }: Props) {
  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl border border-stone-100 shadow-sm p-4">

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="text-[12px] font-extrabold text-stone-700">이번 시기 체크포인트</h2>
      </div>

      {/* 설명 */}
      <p className="text-[12px] font-medium text-stone-500 leading-relaxed mb-3">
        {brief.desc}
      </p>

      {/* 체크포인트 칩 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
        {brief.points.map((point) => (
          <span
            key={point}
            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100"
          >
            {point}
          </span>
        ))}
      </div>

      {/* CTA — 성장 기록만 (탐색 CTA는 Hero에서 담당) */}
      <Link
        href="/record"
        className="text-[11px] font-extrabold text-stone-500 hover:text-orange-500 flex items-center gap-1 transition-colors"
      >
        성장 기록하기
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  )
}
