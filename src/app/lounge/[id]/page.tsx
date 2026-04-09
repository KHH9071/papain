"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "../../_components/AuthProvider"

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

type Comment = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

const CATEGORY_META: Record<PostCategory, { label: string; icon: string; cls: string }> = {
  general:  { label: "자유",   icon: "💬", cls: "bg-gray-100 text-gray-600" },
  review:   { label: "후기",   icon: "⭐", cls: "bg-amber-50 text-amber-600" },
  growth:   { label: "성장",   icon: "📈", cls: "bg-emerald-50 text-emerald-600" },
  question: { label: "질문",   icon: "❓", cls: "bg-blue-50 text-blue-600" },
}

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

function maskEmail(userId: string): string {
  return userId.slice(0, 6) + "..."
}

export default function PostDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const { user } = useAuth()
  const postId  = params.id as string

  const [post, setPost]           = useState<Post | null>(null)
  const [comments, setComments]   = useState<Comment[]>([])
  const [loading, setLoading]     = useState(true)
  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting]   = useState(false)

  const supabase = createClient()

  const fetchPost = useCallback(async () => {
    const { data, error } = await supabase
      .from("lounge_posts")
      .select("*")
      .eq("id", postId)
      .single()

    if (!error && data) {
      setPost(data as Post)
      setLikeCount(data.like_count)
    }
    setLoading(false)
  }, [postId, supabase])

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("lounge_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })

    if (!error && data) setComments(data as Comment[])
  }, [postId, supabase])

  const checkLiked = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from("lounge_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle()

    setLiked(!!data)
  }, [postId, user, supabase])

  useEffect(() => {
    fetchPost()
    fetchComments()
    checkLiked()
  }, [fetchPost, fetchComments, checkLiked])

  const handleLike = async () => {
    if (!user) return
    if (liked) {
      await supabase
        .from("lounge_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
      setLiked(false)
      setLikeCount((c) => c - 1)
    } else {
      await supabase
        .from("lounge_likes")
        .insert({ post_id: postId, user_id: user.id })
      setLiked(true)
      setLikeCount((c) => c + 1)
    }
  }

  const handleComment = async () => {
    if (!user || !commentText.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from("lounge_comments").insert({
      post_id: postId,
      user_id: user.id,
      body: commentText.trim(),
    })
    if (!error) {
      setCommentText("")
      fetchComments()
      // 댓글 수 갱신
      setPost((prev) => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev)
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!user || !post || post.user_id !== user.id) return
    const { error } = await supabase.from("lounge_posts").delete().eq("id", postId)
    if (!error) router.replace("/lounge")
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("lounge_comments").delete().eq("id", commentId)
    fetchComments()
    setPost((prev) => prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : prev)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-5">
        <p className="text-gray-400 font-bold text-sm mb-4">글을 찾을 수 없어요</p>
        <button onClick={() => router.back()} className="text-orange-500 font-bold text-sm">
          뒤로 가기
        </button>
      </div>
    )
  }

  const catMeta = CATEGORY_META[post.category]
  const isAuthor = user?.id === post.user_id

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 z-20 px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-900 flex-1 truncate">라운지</h1>
          {isAuthor && (
            <button
              onClick={handleDelete}
              className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {/* 글 본문 */}
        <section className="bg-white px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${catMeta.cls}`}>
              {catMeta.icon} {catMeta.label}
            </span>
            <span className="text-[10px] text-gray-400">{timeAgo(post.created_at)}</span>
            <span className="text-[10px] text-gray-300">{maskEmail(post.user_id)}</span>
          </div>

          <h2 className="text-lg font-bold text-gray-900 leading-snug mb-3">{post.title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{post.body}</p>

          {/* 좋아요 버튼 */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                liked
                  ? "bg-red-50 text-red-500 border border-red-200"
                  : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500"
              } disabled:opacity-40`}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {comments.length}
            </span>
          </div>
        </section>

        {/* 댓글 목록 */}
        <section className="bg-white mt-2 px-5 py-4">
          <p className="text-xs font-medium text-gray-400 mb-3">댓글 {comments.length}개</p>

          {comments.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-6">아직 댓글이 없어요</p>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400 shrink-0 mt-0.5">
                    {c.user_id.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold text-gray-600">{maskEmail(c.user_id)}</span>
                      <span className="text-[10px] text-gray-300">{timeAgo(c.created_at)}</span>
                      {user?.id === c.user_id && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-[10px] text-gray-300 hover:text-red-500 ml-auto"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 댓글 입력 */}
      {user ? (
        <div className="absolute bottom-[64px] left-0 right-0 bg-white border-t border-gray-100 px-4 py-2.5 z-30 flex items-center gap-2"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleComment() }}
            placeholder="댓글을 입력하세요"
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-gray-50 focus:ring-1 focus:ring-orange-300"
          />
          <button
            onClick={handleComment}
            disabled={submitting || !commentText.trim()}
            className="px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors shrink-0"
          >
            등록
          </button>
        </div>
      ) : (
        <div className="absolute bottom-[64px] left-0 right-0 bg-gray-50 border-t border-gray-100 px-5 py-3 z-30 text-center"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <p className="text-xs text-gray-400">
            <a href="/my" className="text-orange-500 font-bold">로그인</a>하면 댓글을 작성할 수 있어요
          </p>
        </div>
      )}
    </div>
  )
}
