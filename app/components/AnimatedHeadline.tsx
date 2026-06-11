'use client'

import { useState, useEffect } from 'react'

const WORDS = ['menu', 'catalog', 'booking', 'storefront', 'reservation']
const INTERVAL = 1500
const STRIKETHROUGH_DURATION = 0.2
const FADE_DURATION = 0.15

export default function AnimatedHeadline() {
  const [index, setIndex]       = useState(0)
  const [phase, setPhase]       = useState<'idle' | 'strike' | 'swap'>('idle')
  const [strikeWidth, setStrikeWidth] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      // Phase 1: animate strikethrough
      setPhase('strike')
      setStrikeWidth(0)

      const strikeStart = performance.now()
      let raf: number

      const animateStrike = (now: number) => {
        const progress = Math.min((now - strikeStart) / (STRIKETHROUGH_DURATION * 1000), 1)
        setStrikeWidth(progress * 100)
        if (progress < 1) {
          raf = requestAnimationFrame(animateStrike)
        } else {
          // Phase 2 & 3: swap word
          setTimeout(() => {
            setPhase('swap')
            setIndex((prev) => (prev + 1) % WORDS.length)
            setTimeout(() => {
              setStrikeWidth(0)
              setPhase('idle')
            }, FADE_DURATION * 1000 + 50)
          }, 120)
        }
      }

      raf = requestAnimationFrame(animateStrike)
      return () => cancelAnimationFrame(raf)
    }, INTERVAL)

    return () => clearInterval(timer)
  }, [])

  return (
    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-[1.15] tracking-tight">
      {/* Line 1: "Stop giving away" */}
      <span className="block">Stop giving away</span>

      {/* Line 2: dynamic word — key change remounts the span, replaying the CSS enter animation */}
      <span className="inline-flex items-center relative h-[1.15em]">
        <span key={index} className="relative inline-block animate-wordIn">
          {WORDS[index]}

          {/* Strikethrough line */}
          {phase !== 'idle' && (
            <span
              className="absolute left-0 top-[60%] -translate-y-1/2 h-[5px] bg-ink rounded-full pointer-events-none"
              style={{ width: `${strikeWidth}%` }}
            />
          )}
        </span>
      </span>

      {/* Line 3: accent */}
      <span className="block text-brand">your profits.</span>
    </h1>
  )
}
