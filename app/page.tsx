import Link from 'next/link'
import AnimatedPlatform from './components/AnimatedPlatform'
import DemoPickerButton from './components/DemoPickerButton'
import ComparisonSlider from './components/ComparisonSlider'
import AnimatedSectionLabel from './components/AnimatedSectionLabel'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-ink">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-brand tracking-tight">odabear</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-fog hover:text-ink transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register" className="text-sm font-semibold bg-gradient-to-r from-brand-dark to-brand text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand/8 border border-brand/20 text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          Zero commission · No app required · Ready in 5 minutes
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink leading-[1.12] tracking-tight max-w-3xl mx-auto">
          100% of the profits.
          <span className="block text-brand">No middleman.</span>
        </h1>

        <p className="mt-7 text-base sm:text-lg text-fog max-w-2xl mx-auto leading-relaxed">
          Ditch the chaotic WhatsApp orders and{' '}
          <AnimatedPlatform />.{' '}
          Get a professional, automated storefront for a flat{' '}
          <span className="font-semibold text-ink">RM 150/month.</span>{' '}
          Keep every cent you earn.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register"
            className="w-full sm:w-auto bg-gradient-to-r from-brand-dark to-brand text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-base shadow-lg shadow-brand/25">
            Create Your Store →
          </Link>
          <DemoPickerButton />
        </div>

        <p className="mt-5 text-xs text-fog">No credit card required. Setup takes under 5 minutes.</p>
      </section>

      {/* ── Before & After ───────────────────────────────────── */}
      <section className="bg-surface py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 mb-10">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-fog mb-3">The difference</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center">
            From chaos to clarity
          </h2>
        </div>
        <ComparisonSlider />
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-5">
        <AnimatedSectionLabel />
        <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center mb-14">
          3 Steps and 5 Minutes.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              icon: '🛍️',
              title: 'Setup in Minutes',
              desc: 'Upload your menu items, product photos, and DuitNow QR code. No tech skills needed.',
            },
            {
              step: '02',
              icon: '🔗',
              title: 'Share Your Link',
              desc: 'Drop your odabear.com/yourname link in your Instagram bio, TikTok, or send it directly to customers.',
            },
            {
              step: '03',
              icon: '💸',
              title: 'Get Paid Directly',
              desc: 'Orders arrive on WhatsApp fully itemised. Cash goes straight to your bank — zero commission.',
            },
          ].map((item) => (
            <div key={item.step} className="relative flex flex-col items-start gap-4 p-6 rounded-2xl bg-surface">
              <span className="absolute top-4 right-5 text-4xl font-black text-border select-none">{item.step}</span>
              <span className="text-4xl">{item.icon}</span>
              <div>
                <h3 className="font-bold text-ink text-lg mb-1.5">{item.title}</h3>
                <p className="text-sm text-fog leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Supported Verticals ──────────────────────────────── */}
      <section className="bg-surface py-20">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-fog mb-3">Built for your business</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center mb-14">
            One platform, every type of seller
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                emoji: '🍽️',
                color: 'from-orange-50 to-red-50',
                border: 'border-orange-100',
                badge: 'F&B / Restaurant',
                badgeCls: 'bg-orange-100 text-orange-700',
                title: 'Food & Beverage',
                features: [
                  'Digital menus with photos',
                  'Category tabs (Drinks, Mains)',
                  'Out-of-stock toggles',
                  'Promo banners',
                ],
              },
              {
                emoji: '🛒',
                color: 'from-blue-50 to-indigo-50',
                border: 'border-blue-100',
                badge: 'Retail',
                badgeCls: 'bg-blue-100 text-blue-700',
                title: 'Retail & Products',
                features: [
                  'Product catalog with images',
                  'Multiple categories',
                  'Price & availability control',
                  'WhatsApp checkout',
                ],
              },
              {
                emoji: '🏡',
                color: 'from-green-50 to-teal-50',
                border: 'border-green-100',
                badge: 'Booking',
                badgeCls: 'bg-green-100 text-green-700',
                title: 'Homestays & Services',
                features: [
                  'Check-in / check-out picker',
                  'Booking calendar',
                  'Block unavailable dates',
                  'Reservation via WhatsApp',
                ],
              },
            ].map((v) => (
              <div key={v.title} className={`bg-gradient-to-b ${v.color} rounded-2xl border ${v.border} p-6 flex flex-col gap-5`}>
                <div>
                  <span className="text-4xl">{v.emoji}</span>
                  <span className={`ml-3 text-xs font-bold px-2.5 py-1 rounded-full ${v.badgeCls}`}>{v.badge}</span>
                </div>
                <h3 className="font-bold text-ink text-xl">{v.title}</h3>
                <ul className="space-y-2 flex-1">
                  {v.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-fog">
                      <span className="w-4 h-4 rounded-full bg-white border border-border flex items-center justify-center text-[10px] text-green-600 font-bold shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-5">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-fog mb-3">Pricing</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center mb-12">
          One plan. Everything included.
        </h2>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl border-2 border-ink shadow-[0_8px_40px_rgba(0,0,0,0.10)] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-ink to-[#444] px-8 py-10 text-center text-white">
              <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Monthly Plan</p>
              <div className="flex items-end justify-center gap-1 mb-1">
                <span className="text-2xl font-bold text-white/70 mb-2">RM</span>
                <span className="text-7xl font-black leading-none">150</span>
                <span className="text-xl font-semibold text-white/70 mb-2">/ mo</span>
              </div>
              <p className="text-sm text-white/60 mt-2">Billed monthly. Cancel anytime.</p>
            </div>

            {/* Features */}
            <div className="px-8 py-8 space-y-4">
              {[
                ['0% commission on every sale', true],
                ['Unlimited menu items & products', true],
                ['All 3 business types included', true],
                ['WhatsApp order integration', true],
                ['Payment QR code upload', true],
                ['Real-time order dashboard', true],
                ['Custom storefront link', true],
                ['Mobile-first design', true],
              ].map(([feature, included]) => (
                <div key={String(feature)} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <span className="text-brand text-xs font-bold">✓</span>
                  </span>
                  <span className="text-sm font-medium text-ink">{String(feature)}</span>
                </div>
              ))}

              <div className="pt-2 border-t border-border mt-2">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-surface flex items-center justify-center shrink-0">
                    <span className="text-fog text-xs font-bold">✕</span>
                  </span>
                  <span className="text-sm text-fog line-through">Platform commissions</span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="w-5 h-5 rounded-full bg-surface flex items-center justify-center shrink-0">
                    <span className="text-fog text-xs font-bold">✕</span>
                  </span>
                  <span className="text-sm text-fog line-through">Hidden transaction fees</span>
                </div>
              </div>

              <Link href="/register"
                className="block w-full mt-4 bg-gradient-to-r from-brand-dark to-brand text-white font-bold text-center py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-brand/25 text-base">
                Get Started — RM 150/mo →
              </Link>

              <p className="text-center text-xs text-fog">No credit card required to sign up</p>
            </div>
          </div>

          {/* Trust note */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { n: '0%', label: 'Commission' },
              { n: '5 min', label: 'Setup time' },
              { n: '100%', label: 'Your money' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black text-ink">{s.n}</p>
                <p className="text-xs text-fog mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="bg-ink py-20 px-5 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-xl mx-auto leading-tight">
          Your store is 5 minutes away.
        </h2>
        <p className="text-white/60 mb-10 text-base max-w-sm mx-auto">
          Join thousands of Malaysian sellers who have ditched the chaos and gone digital.
        </p>
        <Link href="/register"
          className="inline-block bg-brand text-white font-bold px-10 py-4 rounded-xl hover:bg-brand-dark transition-colors text-base shadow-lg shadow-brand/30">
          Create Your Free Store →
        </Link>
        <p className="mt-4 text-white/40 text-xs">No contracts. No setup fees. Just RM 150/month.</p>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border px-5 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-base font-bold text-brand">odabear</span>
          <div className="flex items-center gap-6 text-xs text-fog">
            <Link href="/login" className="hover:text-ink transition-colors">Login</Link>
            <a href="mailto:holaodabear@gmail.com" className="hover:text-ink transition-colors">Contact</a>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
          </div>
          <p className="text-xs text-fog">© {new Date().getFullYear()} Odabear. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

// ─── Chat bubble helper ───────────────────────────────────────

function ChatBubble({ from, text }: { from: 'customer' | 'vendor'; text: string }) {
  const isVendor = from === 'vendor'
  return (
    <div className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-3 py-2 rounded-xl shadow-sm text-gray-800 ${
        isVendor ? 'bg-[#DCF8C6] rounded-tr-sm' : 'bg-white rounded-tl-sm'
      }`}>
        {text}
      </div>
    </div>
  )
}
