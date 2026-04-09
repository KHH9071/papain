"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type AuthTab = "login" | "signup"

export default function AuthForm() {
  const [tab, setTab] = useState<AuthTab>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "이메일 또는 비밀번호가 올바르지 않아요"
        : error.message)
    }
    setLoading(false)
  }

  const handleSignup = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage("확인 이메일을 보냈어요. 메일함을 확인해주세요!")
    }
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tab === "login") handleLogin()
    else handleSignup()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => { setTab("login"); setError(null); setMessage(null) }}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${
            tab === "login"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-400"
          }`}
        >
          로그인
        </button>
        <button
          onClick={() => { setTab("signup"); setError(null); setMessage(null) }}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${
            tab === "signup"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-400"
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
        />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
        />

        {error && (
          <p className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {message && (
          <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-md shadow-orange-500/20 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {loading
            ? "처리 중..."
            : tab === "login" ? "로그인" : "회원가입"}
        </button>
      </form>
    </div>
  )
}
