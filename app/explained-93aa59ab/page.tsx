import type { Metadata } from 'next'
import PrintButton from './PrintButton'

// Unlisted page — not linked from any nav/sitemap, and excluded from indexing.
// The URL itself is the access control.
export const metadata: Metadata = {
  title: 'How Odabear Works — Private Reference',
  robots: { index: false, follow: false, nocache: true },
}

const ORDER_STEPS = [
  {
    n: '1',
    title: 'Customer opens the link',
    desc: 'They tap the vendor’s odabear.com/[name] link, or find them browsing odabear.com/bazaar.',
  },
  {
    n: '2',
    title: 'Browse the storefront',
    desc: 'Menu, products, or rooms — with photos, prices, and live availability. No app or login needed.',
  },
  {
    n: '3',
    title: 'Add to cart & checkout',
    desc: 'Subtotal and delivery fee (if applicable) are calculated live. Customer enters name, phone, and delivery or pickup details.',
  },
  {
    n: '4',
    title: 'Pay the vendor directly',
    desc: 'The vendor’s own DuitNow, PayNow, or bank QR is shown. Customer scans it with their own banking app — amount auto-fills for DuitNow.',
  },
  {
    n: '5',
    title: 'Upload proof of payment',
    desc: 'A screenshot of the transfer is uploaded as a receipt, right on the order confirmation page.',
  },
  {
    n: '6',
    title: 'Vendor confirms',
    desc: 'Vendor gets a WhatsApp alert + dashboard order. They check the receipt and confirm (or reject if it doesn’t match).',
  },
  {
    n: '7',
    title: 'Order fulfilled',
    desc: 'Customer sees live status on their own order page. Vendor preps the order, all itemised on WhatsApp.',
  },
]

const INCLUDED = [
  'Unlimited menu items / products / rooms',
  'All 3 business types (F&B, Retail, Booking)',
  'WhatsApp order notifications',
  'Own payment QR (DuitNow / PayNow / Bank)',
  'Real-time order dashboard',
  'Custom storefront link (odabear.com/yourname)',
  'Mobile-first storefront for customers',
  '0% commission — forever',
]

const VERTICALS = [
  { emoji: '🍽️', title: 'Food & Beverage', desc: 'Digital menu, categories, out-of-stock toggles, promo banners.' },
  { emoji: '🛍️', title: 'Retail & Products', desc: 'Product catalog with photos, multiple categories, stock control.' },
  { emoji: '🏡', title: 'Homestays & Services', desc: 'Check-in/out picker, booking calendar, blocked dates.' },
]

export default function ExplainerPage() {
  return (
    <div className="min-h-screen bg-white text-ink print:text-[12px]">
      <PrintButton />

      <div className="max-w-3xl mx-auto px-5 py-12 print:py-4">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="mb-10 print:mb-6">
          <div className="inline-flex items-center gap-2 bg-surface border border-border text-fog text-xs font-semibold px-3 py-1.5 rounded-full mb-5 print:hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Private reference — not linked anywhere on odabear.com
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink leading-tight tracking-tight">
            How Odabear actually works
          </h1>
          <p className="mt-3 text-base text-fog leading-relaxed max-w-xl">
            One page covering the whole system: what it does, what it costs, and exactly how money
            moves between a customer, a vendor, and Odabear.
          </p>
        </div>

        {/* ── Quick stats ──────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-12 print:mb-6 print:gap-2">
          {[
            { n: '0%', label: 'Commission, ever' },
            { n: 'RM150', label: 'Flat, per month' },
            { n: '30 days', label: 'Free trial' },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-2xl p-4 text-center print:p-2 print:rounded-lg">
              <p className="text-xl sm:text-2xl font-black text-ink">{s.n}</p>
              <p className="text-xs text-fog mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── The big picture ──────────────────────────────── */}
        <section className="mb-12 print:mb-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold text-ink mb-2">The big picture</h2>
          <p className="text-sm text-fog leading-relaxed mb-6">
            Odabear gives small Malaysian businesses a free professional storefront at
            <span className="font-semibold text-ink"> odabear.com/[their-name]</span>. Customers
            browse, order, and pay without installing anything. The vendor pays one flat monthly
            fee to Odabear and keeps 100% of every sale.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:gap-2">
            {[
              { icon: '🛍️', title: 'Vendor sets up', desc: 'Menu/products/rooms, photos, logo, and their own payment QR. About 5 minutes.' },
              { icon: '🔗', title: 'Vendor shares the link', desc: 'On Instagram, TikTok, WhatsApp status, business cards — anywhere.' },
              { icon: '💸', title: 'Customers order & pay', desc: 'WhatsApp alert + dashboard order. Money lands directly in the vendor’s own bank account.' },
            ].map((s) => (
              <div key={s.title} className="bg-surface rounded-2xl p-4 print:p-2 print:rounded-lg print:break-inside-avoid">
                <span className="text-2xl">{s.icon}</span>
                <h3 className="font-bold text-ink text-sm mt-2 mb-1">{s.title}</h3>
                <p className="text-xs text-fog leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Order flow ───────────────────────────────────── */}
        <section className="mb-12 print:mb-6">
          <h2 className="text-xl font-bold text-ink mb-2">The order flow, step by step</h2>
          <p className="text-sm text-fog leading-relaxed mb-6">
            What a customer actually experiences, from finding a vendor to the vendor confirming
            their order.
          </p>

          <div className="space-y-4">
            {ORDER_STEPS.map((s) => (
              <div key={s.n} className="flex gap-4 print:break-inside-avoid">
                <div className="shrink-0 w-8 h-8 rounded-full bg-ink text-white text-sm font-bold flex items-center justify-center">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm">{s.title}</h3>
                  <p className="text-xs text-fog leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Money flow ───────────────────────────────────── */}
        <section className="mb-12 print:mb-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold text-ink mb-2">Where does the money go?</h2>
          <p className="text-sm text-fog leading-relaxed mb-6">
            Two completely separate money flows. Odabear is only ever in the second one.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-2">
            {/* Flow A — order money */}
            <div className="border-2 border-brand/20 bg-brand/5 rounded-2xl p-5 print:p-3 print:rounded-lg print:break-inside-avoid">
              <p className="text-xs font-bold uppercase tracking-widest text-brand mb-3">Every order</p>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="bg-white border border-border rounded-xl px-4 py-3 w-full text-sm font-semibold">
                  Customer’s banking app
                </div>
                <div className="text-fog text-xs leading-tight">
                  ↓ scans vendor’s own<br />DuitNow / PayNow / Bank QR
                </div>
                <div className="bg-white border border-border rounded-xl px-4 py-3 w-full text-sm font-semibold">
                  Vendor’s bank account
                </div>
              </div>
              <p className="text-xs text-fog leading-relaxed mt-4">
                Odabear never touches this money. <span className="font-semibold text-ink">100% goes to the
                vendor, 0% commission</span> — always.
              </p>
            </div>

            {/* Flow B — subscription */}
            <div className="border-2 border-border bg-surface rounded-2xl p-5 print:p-3 print:rounded-lg print:break-inside-avoid">
              <p className="text-xs font-bold uppercase tracking-widest text-fog mb-3">Once a month</p>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="bg-white border border-border rounded-xl px-4 py-3 w-full text-sm font-semibold">
                  Vendor’s banking app
                </div>
                <div className="text-fog text-xs leading-tight">
                  ↓ scans Odabear’s DuitNow QR<br />pays RM 150
                </div>
                <div className="bg-white border border-border rounded-xl px-4 py-3 w-full text-sm font-semibold">
                  Odabear’s bank account
                </div>
              </div>
              <p className="text-xs text-fog leading-relaxed mt-4">
                Vendor uploads the receipt → store <span className="font-semibold text-ink">auto-activates
                immediately</span> and stays live for 30 more days. Admin reviews afterwards.
              </p>
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────── */}
        <section className="mb-12 print:mb-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold text-ink mb-2">Pricing, in plain terms</h2>
          <ul className="text-sm text-fog leading-relaxed space-y-1.5 mb-5 list-disc list-inside">
            <li><span className="font-semibold text-ink">RM 150/month flat</span> — that’s the whole price list.</li>
            <li><span className="font-semibold text-ink">First 30 days free</span> — full storefront, no credit card.</li>
            <li>If a vendor doesn’t renew, the store quietly goes <span className="font-semibold text-ink">offline</span> (not deleted) — it comes back the moment a new receipt is uploaded.</li>
            <li>No setup fees, no per-order fees, no contracts — cancel anytime.</li>
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INCLUDED.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-brand text-[10px] font-bold">✓</span>
                </span>
                <span className="text-xs font-medium text-ink">{f}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Who it's for ─────────────────────────────────── */}
        <section className="mb-12 print:mb-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold text-ink mb-4">Who it’s for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:gap-2">
            {VERTICALS.map((v) => (
              <div key={v.title} className="bg-surface rounded-2xl p-4 print:p-2 print:rounded-lg print:break-inside-avoid">
                <span className="text-2xl">{v.emoji}</span>
                <h3 className="font-bold text-ink text-sm mt-2 mb-1">{v.title}</h3>
                <p className="text-xs text-fog leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="border-t border-border pt-6 print:hidden">
          <p className="text-xs text-fog leading-relaxed">
            This page is unlisted — it isn’t linked anywhere on odabear.com and is excluded from
            search engines. Bookmark this URL to come back, or tap “Save as PDF” above to export it.
          </p>
        </footer>

      </div>
    </div>
  )
}
