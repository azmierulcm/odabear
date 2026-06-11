'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function WelcomePage() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">

      {/* Animated checkmark circle */}
      <div
        className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
      >
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-8">
          <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Text content */}
      <div
        className={`text-center transition-all duration-700 delay-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <h1 className="text-3xl font-bold text-ink mb-3">You&apos;re in!</h1>
        <p className="text-fog text-base max-w-sm leading-relaxed mb-2">
          Your email has been confirmed and your Odabear account is now active.
        </p>
        <p className="text-fog text-base max-w-sm leading-relaxed mb-10">
          Head to your dashboard to set up your shop and start taking orders.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl px-8 py-3.5 transition-colors"
        >
          Go to my dashboard
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* Subtle branding */}
      <div
        className={`absolute bottom-8 transition-all duration-700 delay-500 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <p className="text-xs text-fog">
          Powered by{' '}
          <span className="font-semibold text-ink">Odabear</span>
        </p>
      </div>
    </div>
  )
}
