import Link from "next/link"

export default function NotFound() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-5">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4">
        🔍
      </div>
      <h2 className="text-base font-bold text-gray-800 mb-1">페이지를 찾을 수 없어요</h2>
      <p className="text-sm text-gray-400 text-center mb-6">
        요청하신 페이지가 존재하지 않아요.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-orange-500 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
