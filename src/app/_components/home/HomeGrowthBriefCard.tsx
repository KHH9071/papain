"use client"

import Link from "next/link"
import type { GrowthMilestone } from "@/lib/home_briefs"

// 발달 도메인 → 이모지 매핑
const DOMAIN_EMOJI: Record<string, string> = {
  "인지·언어":   "💬",
  "신체·운동":   "🤸",
  "정서·사회성": "💛",
  "식습관":     "🍽",
  "수유 리듬":   "🍼",
  "생활 리듬":   "🌙",
}

type Props = {
  monthsOld: number
  milestone: GrowthMilestone
}

export default function HomeGrowthBriefCard({ monthsOld, milestone }: Props) {
  return (
    <section className="bg-white px-5 py-8 mb-2">

      {/* 섹션 헤더 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1">
          ✨ {monthsOld}개월 성장 마일스톤
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {milestone.subtitle}
        </p>
      </div>

      {/* 카드 본체 */}
      <div className="border border-gray-100 rounded-2xl p-5 shadow-sm">

        {/* FOCUS 배지 */}
        <div className="inline-block bg-orange-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-sm tracking-widest uppercase mb-3">
          Month {monthsOld} Focus
        </div>

        {/* 핵심 헤드라인 */}
        <h4 className="text-xl font-bold text-gray-900 mb-5 tracking-tight">
          {milestone.headline}
        </h4>

        {/* 관찰 프롬프트 */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 mb-6">
          <span className="text-xl select-none">💡</span>
          <p className="text-sm font-medium text-gray-800">
            {milestone.prompt}
          </p>
        </div>

        {/* 발달 도메인 그리드 */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {milestone.domains.map((domain) => (
            <div key={domain} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-lg select-none">
                {DOMAIN_EMOJI[domain] ?? "📌"}
              </div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">
                {domain}
              </span>
            </div>
          ))}
        </div>

        {/* CTA — 기록 진입 */}
        <Link
          href="/record"
          className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm transition-colors duration-200 flex items-center justify-center shadow-md shadow-orange-200"
        >
          성장 기록 남기기
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="ml-1">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
