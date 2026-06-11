'use client'

import { useState, useEffect } from 'react'

const WORDS = ['menu', 'catalog', 'booking', 'reservation']
const INTERVAL = 2000
const STRIKE_DURATION = 200

export default function AnimatedSectionLabel() {
  const [index, setIndex]       = useState(0)
  const [phase, setPhase]       = useState<'idle' | 'strike' | 'swap'>('idle')
  const [strikeWidth, setStrikeWidth] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase('strike')
      setStrikeWidth(0)

      const start = performance.now()
      let raf: number

      const animate = (now: number) => {
        const progress = Math.min((now - start) / STRIKE_DURATION, 1)
        setStrikeWidth(progress * 100)
        if (progress < 1) {
          raf = requestAnimationFrame(animate)
        } else {
          setTimeout(() => {
            setPhase('swap')
            setIndex((prev) => (prev + 1) % WORDS.length)
            setTimeout(() => {
              setStrikeWidth(0)
              setPhase('idle')
            }, 200)
          }, 100)
        }
      }

      raf = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(raf)
    }, INTERVAL)

    return () => clearInterval(timer)
  }, [])

  return (
    <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-fog mb-3">
      <span>Your</span>
      <span className="relative inline-flex items-center">
        <span key={index} className="relative inline-block animate-wordIn">
          {WORDS[index]}
          {phase !== 'idle' && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-fog rounded-full pointer-events-none transition-none"
              style={{ width: `${strikeWidth}%` }}
            />
          )}
        </span>
      </span>
      <span>is ready in</span>
    </p>
  )
}
