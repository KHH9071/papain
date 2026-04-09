import type { Metadata, Viewport } from "next"
import "./globals.css"
import BottomNav from "./_components/BottomNav"
import AuthProvider from "./_components/AuthProvider"

export const metadata: Metadata = {
  title: "Papain — 우리아이 안심 영양 설계",
  description: "영유아 건기식·분유·우유 성분을 비교하고, 아이 성장에 맞는 영양 설계를 도와주는 서비스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "파파인",
  },
  openGraph: {
    title: "Papain — 우리아이 안심 영양 설계",
    description: "영유아 건기식·분유·우유 성분을 비교하고, 아이 성장에 맞는 영양 설계를 도와주는 서비스",
    type: "website",
    locale: "ko_KR",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head />
      <body>
        {/* h-[100dvh]: 브라우저 UI(주소창·시스템 네비게이션)를 제외한 실제 가시 영역 */}
        <div className="flex justify-center bg-gray-100 h-[100dvh]">
          <div className="w-full max-w-md bg-white h-full flex flex-col relative overflow-hidden shadow-2xl">
            <AuthProvider>
              <main className="flex-1 overflow-hidden">
                {children}
              </main>
              <BottomNav />
            </AuthProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
