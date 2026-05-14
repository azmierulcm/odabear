'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

function AuthForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode]       = useState<Mode>('signin')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Support /login?mode=signup from register redirects
  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setMode('signup')
  }, [searchParams])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    if (mode === 'forgot') {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Reset link sent! Check your email — it may take a minute to arrive.')
      return
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome` },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Auth Form ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen bg-white px-6 sm:px-12 lg:px-16 py-10 lg:max-w-[50%]">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-brand tracking-tight shrink-0">
          jomoda
        </Link>

        {/* Form area — vertically centered */}
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-12">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-ink tracking-tight">
              {mode === 'signin' ? 'Welcome back.' : mode === 'signup' ? 'Create your store.' : 'Reset your password.'}
            </h1>
            <p className="text-fog text-sm mt-2">
              {mode === 'signin'
                ? 'Sign in to manage your storefront.'
                : mode === 'signup'
                ? 'Start selling in under 5 minutes. No credit card required.'
                : 'Enter your email and we\'ll send a reset link.'}
            </p>
          </div>

          {/* Mode toggle — hidden on forgot screen */}
          {mode !== 'forgot' && (
            <div className="flex bg-surface rounded-xl p-1 mb-8">
              {(['signin', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    mode === m
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-fog hover:text-ink'
                  }`}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
                autoComplete="email"
                autoFocus={mode === 'forgot'}
              />
            </div>

            {/* Password field — hidden on forgot screen */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink uppercase tracking-wide">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-brand font-semibold hover:underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  className={inputCls}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-brand text-sm rounded-xl px-4 py-3">
                <span className="shrink-0 mt-0.5">⚠️</span>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3">
                <span className="shrink-0 mt-0.5">✓</span>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading
                ? <Spinner />
                : mode === 'signin'
                ? 'Sign In →'
                : mode === 'signup'
                ? 'Create Account →'
                : 'Send reset link →'}
            </button>
          </form>

          {/* Back to sign in — shown on forgot screen */}
          {mode === 'forgot' && (
            <p className="text-center text-xs text-fog mt-4">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-brand font-semibold underline underline-offset-2"
              >
                ← Back to sign in
              </button>
            </p>
          )}

          {/* Terms note for signup */}
          {mode === 'signup' && (
            <p className="text-xs text-fog text-center mt-4 leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="#" className="underline hover:text-ink">Terms</a> and{' '}
              <a href="#" className="underline hover:text-ink">Privacy Policy</a>.
            </p>
          )}
        </div>

        {/* Bottom footer */}
        <p className="text-xs text-fog text-center shrink-0">
          © {new Date().getFullYear()} Jomoda · Built for Malaysian sellers
        </p>
      </div>

      {/* ── Right: Visual / Branding ────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">

        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80&fit=crop"
          alt="Cafe background"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Brand badge top-left */}
        <div className="absolute top-10 left-10">
          <span className="text-white/90 text-sm font-semibold bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
            RM 150 / month · 0% commission
          </span>
        </div>

        {/* Testimonial card — frosted glass, bottom-left */}
        <div className="absolute bottom-10 left-10 right-10">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 max-w-sm">
            {/* Stars */}
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <blockquote className="text-white text-sm leading-relaxed mb-4">
              "Switching to this platform completely automated our daily orders.
              It feels like having an extra staff member."
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs font-bold">
                S
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Sarah</p>
                <p className="text-white/60 text-xs">Cafe Owner, Kuala Lumpur</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Processing…
    </span>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const inputCls =
  'w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition bg-white'

const btnPrimary =
  'w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center min-h-[46px]'
