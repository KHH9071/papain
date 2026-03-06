"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

export default function BottomNav() {
  const pathname = usePathname()
  const [toast, setToast] = useState(false)

  const showFakeDoor = () => {
    setToast(true)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <>
      {/* Fake Door Toast */}
      {toast && (
        <div className="absolute bottom-[72px] left-4 right-4 z-50 pointer-events-none">
          <div className="bg-stone-800 text-white text-sm font-bold px-5 py-3.5 rounded-2xl text-center shadow-xl animate-fade-in">
            현재 CBT 기간으로 준비 중인 기능입니다.
          </div>
        </div>
      )}

      {/* GNB */}
      <nav className="flex-shrink-0 h-16 bg-white border-t border-stone-100 flex items-stretch shadow-[0_-4px_20px_rgb(0,0,0,0.05)] z-40">

        {/* 홈 */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            pathname === "/" ? "text-orange-500" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <IconHome active={pathname === "/"} />
          <span className="text-[10px] font-bold">홈</span>
        </Link>

        {/* 탐색 */}
        <Link
          href="/search"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            pathname === "/search" ? "text-orange-500" : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <IconSearch active={pathname === "/search"} />
          <span className="text-[10px] font-bold">탐색</span>
        </Link>

        {/* 기록 — Fake Door */}
        <button
          onClick={showFakeDoor}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <IconRecord />
          <span className="text-[10px] font-bold">기록</span>
        </button>

        {/* 라운지 — Fake Door */}
        <button
          onClick={showFakeDoor}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <IconLounge />
          <span className="text-[10px] font-bold">라운지</span>
        </button>

        {/* 마이 — Fake Door */}
        <button
          onClick={showFakeDoor}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <IconMy />
          <span className="text-[10px] font-bold">마이</span>
        </button>

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

function IconRecord() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  )
}

function IconLounge() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  )
}

function IconMy() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}
