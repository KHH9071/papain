"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "../_components/AuthProvider"

// ── 타입 ─────────────────────────────────────────────────────────────────────
type PostCategory = "general" | "review" | "growth" | "question"

type Post = {
  id: string
  user_id: string
  category: PostCategory
  title: string
  body: string
  like_count: number
  comment_count: number
  created_at: string
}

const CATEGORY_META: Record<PostCategory, { label: string; icon: string; cls: string }> = {
  general:  { label: "자유",   icon: "💬", cls: "bg-gray-100 text-gray-600" },
  review:   { label: "후기",   icon: "⭐", cls: "bg-amber-50 text-amber-600" },
  growth:   { label: "성장",   icon: "📈", cls: "bg-emerald-50 text-emerald-600" },
  question: { label: "질문",   icon: "❓", cls: "bg-blue-50 text-blue-600" },
}

const CATEGORY_TABS: { key: PostCategory | "all"; label: string }[] = [
  { key: "all",      label: "전체" },
  { key: "general",  label: "💬 자유" },
  { key: "review",   label: "⭐ 후기" },
  { key: "growth",   label: "📈 성장" },
  { key: "question", label: "❓ 질문" },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "방금"
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

// ── 글쓰기 모달 ──────────────────────────────────────────────────────────────
function WriteModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (category: PostCategory, title: string, body: string) => Promise<void>
}) {
  const [category, setCategory] = useState<PostCategory>("general")
  const [title, setTitle]       = useState("")
  const [body, setBody]         = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    await onSubmit(category, title.trim(), body.trim())
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">글쓰기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 카테고리 선택 */}
        <div className="flex gap-2 mb-4">
          {(["general", "review", "growth", "question"] as PostCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat]
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${
                  category === cat ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {meta.icon} {meta.label}
              </button>
            )
          })}
        </div>

        {/* 제목 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해 주세요"
          maxLength={100}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 mb-3"
        />

        {/* 본문 */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="내용을 입력해 주세요"
          rows={6}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 resize-none mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim()}
          className="w-full py-3.5 bg-orange-500 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? "등록 중..." : "등록하기"}
        </button>
      </div>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function LoungePage() {
  const { user } = useAuth()
  const [posts, setPosts]       = useState<Post[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<PostCategory | "all">("all")
  const [showWrite, setShowWrite] = useState(false)

  const fetchPosts = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from("lounge_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (filter !== "all") {
      query = query.eq("category", filter)
    }

    const { data, error } = await query
    if (!error && data) setPosts(data as Post[])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleSubmit = async (category: PostCategory, title: string, body: string) => {
    if (!user) return
    const supabase = createClient()
    const { error } = await supabase.from("lounge_posts").insert({
      user_id: user.id,
      category,
      title,
      body,
    })
    if (!error) {
      setShowWrite(false)
      fetchPosts()
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 z-20 px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">라운지</h1>
          {user && (
            <button
              onClick={() => setShowWrite(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              글쓰기
            </button>
          )}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {CATEGORY_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setLoading(true) }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                filter === key ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4">
              ☕
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">아직 글이 없어요</p>
            <p className="text-xs text-gray-400 text-center">
              {user ? "첫 번째 글을 작성해 보세요!" : "로그인하면 글을 작성할 수 있어요."}
            </p>
            {!user && (
              <Link
                href="/my"
                className="mt-4 px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors"
              >
                로그인하기
              </Link>
            )}
          </div>
        ) : (
          <div className="px-5 py-3 flex flex-col gap-2.5">
            {posts.map((post) => {
              const catMeta = CATEGORY_META[post.category]
              return (
                <Link
                  key={post.id}
                  href={`/lounge/${post.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-200 transition-colors block"
                >
                  {/* 카테고리 + 시간 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${catMeta.cls}`}>
                      {catMeta.icon} {catMeta.label}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-sm font-bold text-gray-800 leading-snug mb-1 line-clamp-2">
                    {post.title}
                  </h3>

                  {/* 본문 미리보기 */}
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">
                    {post.body}
                  </p>

                  {/* 좋아요 + 댓글 */}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {post.like_count}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {post.comment_count}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 글쓰기 모달 */}
      {showWrite && <WriteModal onClose={() => setShowWrite(false)} onSubmit={handleSubmit} />}
    </div>
  )
}
