'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import StallCard, { CATEGORY_CONFIG, type BazaarVendor } from './StallCard'

const CATEGORIES = [
  { id: 'all',        label: 'All',      emoji: '🏪' },
  { id: 'restaurant', label: 'F&B',      emoji: '🍽️' },
  { id: 'retail',     label: 'Retail',   emoji: '🛍️' },
  { id: 'booking',    label: 'Services', emoji: '🏡' },
]

interface Props {
  vendors: BazaarVendor[]
}

export default function BazaarClient({ vendors }: Props) {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('all')
  const searchRef  = useRef<HTMLInputElement>(null)

  // Filter logic — runs client-side, fast enough for ~100 items
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vendors.filter((v) => {
      const matchesCat = category === 'all' || v.business_type === category
      const matchesQ   = !q ||
        v.name.toLowerCase().includes(q) ||
        (v.description ?? '').toLowerCase().includes(q)
      return matchesCat && matchesQ
    })
  }, [vendors, search, category])

  const featured = filtered.filter((v) => v.is_featured)
  const rest     = filtered.filter((v) => !v.is_featured)

  // Reset to "all" when search clears so results always make sense
  const handleSearch = (v: string) => {
    setSearch(v)
  }

  const handleCategory = (id: string) => {
    setCategory(id)
    setSearch('')
  }

  return (
    <div className="min-h-screen bg-surface">

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 py-20 lg:py-28 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {vendors.length} local businesses live
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight">
            Support Local.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-orange-400">
              Shop Direct
            </span>
            <br />via WhatsApp.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Browse hundreds of independent shops, restaurants, and homestays — all in one place.
            No middleman. No commissions. Just you and the business owner.
          </p>

          {/* Quick stats */}
          <div className="mt-10 inline-grid grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
            {[
              { n: vendors.filter((v) => v.business_type === 'restaurant').length, label: 'F&B' },
              { n: vendors.filter((v) => v.business_type === 'retail').length,     label: 'Retail' },
              { n: vendors.filter((v) => v.business_type === 'booking').length,    label: 'Services' },
            ].map(({ n, label }) => (
              <div key={label} className="px-6 py-4 bg-white/5">
                <p className="text-2xl font-black">{n}</p>
                <p className="text-xs text-white/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Hero search */}
          <div className="mt-8 max-w-md mx-auto relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-base pointer-events-none">🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search shops, food, services…"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white/15 transition backdrop-blur-sm"
            />
            {search && (
              <button onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xl leading-none">×</button>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════ STICKY FILTER BAR ══════════════════ */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                category === cat.id
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-fog border-border hover:border-ink hover:text-ink'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              {cat.id !== 'all' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  category === cat.id ? 'bg-white/20 text-white' : 'bg-surface text-fog'
                }`}>
                  {vendors.filter((v) => v.business_type === cat.id).length}
                </span>
              )}
            </button>
          ))}

          {/* Spacer + result count */}
          <span className="ml-auto shrink-0 text-xs text-fog whitespace-nowrap">
            {filtered.length} {filtered.length === 1 ? 'shop' : 'shops'}
          </span>
        </div>
      </div>

      {/* ══════════════════ CONTENT ══════════════════ */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">

        {/* No results */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-bold text-ink text-lg mb-1">No shops found</p>
            <p className="text-sm text-fog mb-5">
              We couldn't find anything matching{' '}
              <span className="font-semibold text-ink">"{search}"</span>
            </p>
            <button
              onClick={() => { handleSearch(''); setCategory('all') }}
              className="text-sm font-semibold text-brand underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Featured spotlight ── */}
        {featured.length > 0 && !search && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold text-ink">⭐ Featured Shops</h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featured.map((v) => <StallCard key={v.id} vendor={v} />)}
            </div>
          </section>
        )}

        {/* ── All / remaining shops ── */}
        {rest.length > 0 && (
          <section>
            {featured.length > 0 && !search && (
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-lg font-bold text-ink">All Shops</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {rest.map((v) => <StallCard key={v.id} vendor={v} />)}
            </div>
          </section>
        )}

        {/* When searching, featured + rest collapse into one grid */}
        {search && featured.length > 0 && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featured.map((v) => <StallCard key={v.id} vendor={v} />)}
            </div>
          </section>
        )}

      </main>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="border-t border-border mt-12 py-8 text-center">
        <p className="text-sm text-fog">
          Want your shop listed?{' '}
          <a href="/register" className="font-semibold text-brand underline underline-offset-2">Join Odabear →</a>
        </p>
      </footer>
    </div>
  )
}
