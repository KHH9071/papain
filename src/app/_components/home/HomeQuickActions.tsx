"use client"

import Link from "next/link"

type QuickAction = {
  label: string
  href: string
  icon: string
}

// 파파인식 퀵 액션 — 카테고리 그리드 대신 압축된 탐색 진입
const QUICK_ACTIONS: QuickAction[] = [
  { label: "분유 찾기",   href: "/search?category=formula",                         icon: "🍼" },
  { label: "우유 비교",   href: "/search?category=milk",                            icon: "🥛" },
  { label: "칼슘 제품",   href: `/search?nutrient=${encodeURIComponent("칼슘")}`,   icon: "🦴" },
  { label: "기록 추가",   href: "/record",                                           icon: "📝" },
]

export default function HomeQuickActions() {
  return (
    <div className="mx-4 mt-3">
      <p className="text-[10px] font-bold text-stone-400 mb-2">빠른 진입</p>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ label, href, icon }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-1.5 bg-white border border-stone-100 rounded-2xl py-3 shadow-sm hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] font-extrabold text-stone-600 text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
