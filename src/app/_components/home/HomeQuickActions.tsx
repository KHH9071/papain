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
  { label: "우유 찾기",   href: "/search?category=milk",                            icon: "🥛" },
  { label: "제품 비교",   href: "/compare",                                          icon: "⚖️" },
  { label: "기록 추가",   href: "/record",                                           icon: "📝" },
]

export default function HomeQuickActions() {
  return (
    <section className="bg-white px-5 py-6 mb-2">
      <p className="text-xs font-medium text-gray-400 mb-3">빠른 진입</p>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ label, href, icon }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 bg-gray-50 rounded-xl py-3.5 hover:bg-orange-50 transition-colors"
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
