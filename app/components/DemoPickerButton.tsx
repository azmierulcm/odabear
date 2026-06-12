'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const DEMOS = [
  {
    href: 'https://www.odabear.com/milalalalala-roti-jala',
    emoji: '🍽️',
    label: 'Mini Catering',
    sub: 'Milalalalala Roti Jala',
    badge: 'F&B',
    badgeCls: 'bg-orange-100 text-orange-700',
  },
  {
    href: 'https://www.odabear.com/bubudesserts',
    emoji: '🛒',
    label: 'Dessert Store',
    sub: 'Bubu Desserts',
    badge: 'Retail',
    badgeCls: 'bg-blue-100 text-blue-700',
  },
  {
    href: '/demo-booking',
    emoji: '🏡',
    label: 'Homestay',
    sub: 'The Alpine Loft Retreat',
    badge: 'Booking',
    badgeCls: 'bg-green-100 text-green-700',
  },
]

export default function DemoPickerButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full sm:w-auto border-2 border-border text-ink font-semibold px-8 py-4 rounded-xl hover:border-ink transition-colors text-base flex items-center justify-center gap-2"
      >
        View Sample Store
        <svg
          className={`w-4 h-4 text-fog transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-72 bg-white rounded-2xl border border-border shadow-xl z-50 overflow-hidden">
          <p className="text-[11px] font-bold uppercase tracking-widest text-fog px-4 pt-4 pb-2">
            Choose a sample
          </p>
          {DEMOS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3.5 px-4 py-3 hover:bg-surface transition-colors"
            >
              <span className="text-2xl shrink-0">{d.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink leading-snug">{d.label}</p>
                <p className="text-xs text-fog truncate">{d.sub}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${d.badgeCls}`}>
                {d.badge}
              </span>
            </Link>
          ))}
          <div className="px-4 py-3 border-t border-border bg-surface">
            <p className="text-[11px] text-fog text-center">Live samples — no login required</p>
          </div>
        </div>
      )}
    </div>
  )
}
