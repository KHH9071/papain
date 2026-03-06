import type { Metadata } from "next"
import "./globals.css"
import BottomNav from "./_components/BottomNav"

export const metadata: Metadata = {
  title: "Papain — 우리아이 안심 영양 설계",
  description: "영유아 건기식 성분 안전성 대시보드",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="flex justify-center bg-gray-100 h-screen">
          <div className="w-full max-w-md bg-[#FFFBF7] h-full flex flex-col relative overflow-hidden shadow-2xl">
            {/* 페이지 콘텐츠 — GNB 높이(64px)만큼 하단 패딩 */}
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  )
}
