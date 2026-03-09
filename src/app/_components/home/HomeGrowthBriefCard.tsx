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
    <div className="mx-4 mt-3">

      {/* 섹션 헤더 */}
      <div className="mb-2 px-0.5">
        <h2 className="text-[14px] font-black text-stone-800 flex items-center gap-1.5">
          <span className="text-[12px] select-none">✨</span>
          {monthsOld}개월 성장 마일스톤
        </h2>
        <p className="text-[10px] font-medium text-stone-500 mt-0.5 leading-snug">
          {milestone.subtitle}
        </p>
      </div>

      {/* 카드 본체 */}
      <div className="bg-gradient-to-b from-orange-50/60 to-white rounded-2xl border border-orange-100 shadow-sm p-4">

        {/* FOCUS 배지 */}
        <span className="inline-block px-2 py-0.5 rounded-lg bg-white border border-orange-100 text-orange-500 text-[9px] font-black tracking-widest mb-2.5 shadow-sm">
          MONTH {monthsOld} FOCUS
        </span>

        {/* 핵심 헤드라인 */}
        <h3 className="text-[15px] font-black text-stone-800 leading-snug mb-3">
          {milestone.headline}
        </h3>

        {/* 관찰 프롬프트 */}
        <div className="flex items-start gap-2 bg-white/90 border border-orange-100/50 rounded-xl px-3 py-2.5 mb-4 shadow-sm">
          <span className="text-sm shrink-0 leading-none mt-0.5 select-none">💡</span>
          <p className="text-[11px] font-bold text-stone-600 leading-relaxed">
            {milestone.prompt}
          </p>
        </div>

        {/* 발달 도메인 그리드 */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {milestone.domains.map((domain) => (
            <div key={domain} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-white border border-orange-100/60 shadow-sm flex items-center justify-center text-lg select-none">
                {DOMAIN_EMOJI[domain] ?? "📌"}
              </div>
              <span className="text-[9px] font-extrabold text-stone-500 text-center leading-tight">
                {domain}
              </span>
            </div>
          ))}
        </div>

        {/* CTA — 기록 진입 (탐색 CTA는 Hero에서 담당) */}
        <Link
          href="/record"
          className="flex items-center justify-center gap-1.5 w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-extrabold text-[12px] py-3 rounded-xl transition-colors shadow-sm"
        >
          성장 기록 남기기
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
