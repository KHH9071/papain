"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {/* GNB — backdrop-blur, minimal */}
      <nav
        className="flex-shrink-0 bg-white/80 backdrop-blur-md border-t border-gray-100 z-40 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', minHeight: '64px' }}
      >

        {/* 홈 */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            pathname === "/" ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <IconHome active={pathname === "/"} />
          <span className="text-[10px] font-bold">홈</span>
        </Link>

        {/* 탐색 */}
        <Link
          href="/search"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            pathname === "/search" ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <IconSearch active={pathname === "/search"} />
          <span className="text-[10px] font-bold">탐색</span>
        </Link>

        {/* 기록 */}
        <Link
          href="/record"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            pathname === "/record" ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <IconRecord active={pathname === "/record"} />
          <span className="text-[10px] font-bold">기록</span>
        </Link>

        {/* 라운지 */}
        <Link
          href="/lounge"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            pathname === "/lounge" || pathname?.startsWith("/lounge/") ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <IconLounge active={pathname === "/lounge" || pathname?.startsWith("/lounge/")} />
          <span className="text-[10px] font-bold">라운지</span>
        </Link>

        {/* 마이 */}
        <Link
          href="/my"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            pathname === "/my" ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <IconMy active={pathname === "/my"} />
          <span className="text-[10px] font-bold">마이</span>
        </Link>

      </nav>
    </>
  )
}

// ─── 아이콘 ────────────────────────────────────────────────────────────────────

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" strokeWidth={active ? 1.5 : 2} stroke={active ? "white" : "currentColor"} fill="none" />
    </svg>
  )
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.1" y2="16.1" />
    </svg>
  )
}

function IconRecord({ active }: { active: boolean }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  )
}

function IconLounge({ active }: { active: boolean }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  )
}

function IconMy({ active }: { active: boolean }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}
