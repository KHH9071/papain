"use client"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-5">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-4">
        ⚠️
      </div>
      <h2 className="text-base font-bold text-gray-800 mb-1">문제가 발생했어요</h2>
      <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
        일시적인 오류일 수 있어요.<br />다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-orange-500 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}
