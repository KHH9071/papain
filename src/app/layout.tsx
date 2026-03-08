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
      <head>
        {/* viewport-fit=cover: 시스템 네비게이션 바 영역까지 콘텐츠 확장 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        {/* h-[100dvh]: 브라우저 UI(주소창·시스템 네비게이션)를 제외한 실제 가시 영역 */}
        <div className="flex justify-center bg-gray-100 h-[100dvh]">
          <div className="w-full max-w-md bg-[#FFFBF7] h-full flex flex-col relative overflow-hidden shadow-2xl">
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
