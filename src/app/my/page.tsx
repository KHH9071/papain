"use client"

import { useState } from "react"
import { useAuth } from "../_components/AuthProvider"
import { useAppStore } from "@/lib/store"
import { AGE_GROUP_LABEL, getAgeGroup } from "@/lib/kdri_data"
import { pushToCloud } from "@/lib/sync"
import AuthForm from "../_components/my/AuthForm"

export default function MyPage() {
  const { user, loading, signOut } = useAuth()
  const { monthsOld, gender, setGender, growthRecords, selectedProducts } = useAppStore()
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const ageGroup = getAgeGroup(monthsOld)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 스티키 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 z-20 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">마이</h1>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {!user ? (
          /* ── 비로그인 상태 ── */
          <div className="px-5 pt-6 pb-4 space-y-4">
            <AuthForm />
            <div className="bg-blue-50 rounded-2xl px-5 py-4">
              <p className="text-sm font-bold text-blue-800 mb-1">
                로그인 없이도 사용할 수 있어요
              </p>
              <p className="text-xs text-blue-600 leading-relaxed">
                홈·탐색·기록 기능은 로그인 없이 이용 가능해요.
                로그인하면 데이터가 클라우드에 저장되어 기기를 바꿔도 안전하게 유지돼요.
              </p>
            </div>
          </div>
        ) : (
          /* ── 로그인 상태 ── */
          <div className="px-5 pt-6 pb-4 space-y-3">

            {/* 프로필 카드 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-xl select-none">
                  👶
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-400">{AGE_GROUP_LABEL[ageGroup]}</p>
                </div>
              </div>

              {/* 아이 정보 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">성별</span>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setGender("M")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                        gender === "M"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-400"
                      }`}
                    >
                      남아
                    </button>
                    <button
                      onClick={() => setGender("F")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                        gender === "F"
                          ? "bg-white text-pink-600 shadow-sm"
                          : "text-gray-400"
                      }`}
                    >
                      여아
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">월령</span>
                  <span className="text-sm font-bold text-gray-800">{monthsOld}개월</span>
                </div>
              </div>
            </section>

            {/* 데이터 현황 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-400 mb-3">내 데이터</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-extrabold text-gray-800">{growthRecords.length}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">성장 기록</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-extrabold text-gray-800">{selectedProducts.length}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">선택 제품</p>
                </div>
              </div>
            </section>

            {/* 설정 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-400 mb-3">설정</p>
              <div className="space-y-1">
                <SettingRow label="테마" value="라이트" disabled />
                <SettingRow label="알림" value="준비 중" disabled />
              </div>
            </section>

            {/* 동기화 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-400 mb-3">클라우드 동기화</p>
              <button
                onClick={async () => {
                  setSyncing(true)
                  setSyncMessage(null)
                  try {
                    await pushToCloud(user.id)
                    setSyncMessage("동기화 완료!")
                  } catch {
                    setSyncMessage("동기화 실패. 다시 시도해주세요.")
                  }
                  setSyncing(false)
                  setTimeout(() => setSyncMessage(null), 3000)
                }}
                disabled={syncing}
                className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {syncing ? "동기화 중..." : "지금 동기화"}
              </button>
              {syncMessage && (
                <p className={`text-xs font-bold mt-2 text-center ${
                  syncMessage.includes("완료") ? "text-emerald-600" : "text-red-500"
                }`}>
                  {syncMessage}
                </p>
              )}
            </section>

            {/* 로그아웃 */}
            <button
              onClick={signOut}
              className="w-full py-3.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>

          </div>
        )}
      </div>
    </div>
  )
}

function SettingRow({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 ${disabled ? "opacity-40" : ""}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm text-gray-400">{value}</span>
    </div>
  )
}
