export default function Loading() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-xs font-medium text-gray-400">로딩 중...</p>
      </div>
    </div>
  )
}
