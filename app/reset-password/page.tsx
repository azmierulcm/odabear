'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [done,      setDone]      = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setDone(true)
    // Give the user a moment to read the success message, then go to dashboard
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <Link href="/" className="block text-xl font-bold text-brand tracking-tight mb-8 text-center">
          odabear
        </Link>

        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm space-y-6">

          {done ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-4xl">🎉</p>
              <p className="font-bold text-ink text-lg">Password updated!</p>
              <p className="text-sm text-fog">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-ink">Set new password</h1>
                <p className="text-sm text-fog mt-1">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                    New password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={inputCls}
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className={inputCls}
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-brand text-sm rounded-xl px-4 py-3">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? 'Updating…' : 'Update password →'}
                </button>
              </form>

              <p className="text-center text-xs text-fog">
                <Link href="/login" className="text-brand font-semibold underline underline-offset-2">
                  ← Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition bg-white'

const btnPrimary =
  'w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 disabled:opacity-60 transition-opacity'
