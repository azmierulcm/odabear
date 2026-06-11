'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Vendor, BusinessType, Order, Booking, OrderLineItem, PaymentStatus } from '@/types/menu'

// Sales aggregate window — how many recent rows to pull for the report.
const ANALYTICS_FETCH_LIMIT = 2000

// ─── Analytics / Sales ──────────────────────────────────────────
// A normalised sale, so confirmed orders and confirmed bookings can share
// the same revenue + top-seller maths.
interface SaleRecord {
  id: string
  total: number
  paymentStatus: PaymentStatus
  createdAt: string
  lines: { name: string; quantity: number; revenue: number }[]
}

type SalesPeriod = '7d' | '30d' | 'all'

const SALES_PERIODS: { id: SalesPeriod; label: string }[] = [
  { id: '7d',  label: 'This week' },
  { id: '30d', label: 'This month' },
  { id: 'all', label: 'All time' },
]

export default function AnalyticsTab({ vendor, businessType, supabase }: {
  vendor: Vendor
  businessType: BusinessType
  supabase: ReturnType<typeof createClient>
}) {
  const isBooking = businessType === 'booking'
  const noun      = isBooking ? 'bookings' : 'orders'

  const [records, setRecords] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState<SalesPeriod>('7d')
  // "Now" is captured when data loads (not read during render) so the stats
  // useMemo below stays a pure, deterministic derivation.
  const [now, setNow] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (isBooking) {
        const { data } = await supabase
          .from('bookings')
          .select('id, total_price, payment_status, created_at, service_name')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false })
          .limit(ANALYTICS_FETCH_LIMIT)
        const rows = (data ?? []) as Booking[]
        setRecords(rows.map((b) => {
          const total = Number(b.total_price ?? 0)
          return {
            id:            b.id,
            total,
            paymentStatus: b.payment_status,
            createdAt:     b.created_at,
            lines:         [{ name: b.service_name, quantity: 1, revenue: total }],
          }
        }))
      } else {
        const { data } = await supabase
          .from('orders')
          .select('id, total_price, payment_status, created_at, items, cart_items')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false })
          .limit(ANALYTICS_FETCH_LIMIT)
        const rows = (data ?? []) as Order[]
        setRecords(rows.map((o) => {
          const lineItems = ((o.items?.length ? o.items : o.cart_items) ?? []) as OrderLineItem[]
          return {
            id:            o.id,
            total:         Number(o.total_price ?? 0),
            paymentStatus: o.payment_status,
            createdAt:     o.created_at,
            lines:         lineItems.map((li) => ({
              name:    li.name,
              quantity: li.quantity,
              revenue: li.price * li.quantity,
            })),
          }
        }))
      }
      setNow(Date.now())
      setLoading(false)
    }
    load()
  }, [vendor.id, supabase, isBooking])

  const stats = useMemo(() => {
    const cutoff = period === 'all'
      ? 0
      : now - (period === '7d' ? 7 : 30) * 86_400_000
    const inPeriod  = records.filter((r) => new Date(r.createdAt).getTime() >= cutoff)
    const confirmed = inPeriod.filter((r) => r.paymentStatus === 'confirmed')

    const revenue  = confirmed.reduce((s, r) => s + r.total, 0)
    const awaiting = inPeriod
      .filter((r) => r.paymentStatus === 'awaiting' || r.paymentStatus === 'submitted')
      .reduce((s, r) => s + r.total, 0)
    const avg = confirmed.length ? revenue / confirmed.length : 0

    // Top sellers, by confirmed revenue
    const map = new Map<string, { quantity: number; revenue: number }>()
    for (const r of confirmed) {
      for (const l of r.lines) {
        const cur = map.get(l.name) ?? { quantity: 0, revenue: 0 }
        cur.quantity += l.quantity
        cur.revenue  += l.revenue
        map.set(l.name, cur)
      }
    }
    const topSellers = [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return { revenue, awaiting, avg, confirmedCount: confirmed.length, periodCount: inPeriod.length, topSellers }
  }, [records, period, now])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-11 rounded-xl bg-surface animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-surface animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Period toggle */}
      <div className="inline-flex rounded-xl bg-surface p-1 border border-border">
        {SALES_PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
              period === p.id ? 'bg-white text-ink shadow-sm' : 'text-fog hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Revenue"
          value={`RM ${stats.revenue.toFixed(2)}`}
          sub={`${stats.confirmedCount} paid ${noun}`}
          accent
        />
        <StatCard
          label={`Paid ${noun}`}
          value={String(stats.confirmedCount)}
          sub={`of ${stats.periodCount} total`}
        />
        <StatCard
          label="Awaiting payment"
          value={`RM ${stats.awaiting.toFixed(2)}`}
          sub="not yet confirmed"
        />
        <StatCard
          label="Average sale"
          value={`RM ${stats.avg.toFixed(2)}`}
          sub={stats.confirmedCount ? 'per paid order' : 'no sales yet'}
        />
      </div>

      {/* Top sellers */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h3 className="text-sm font-bold text-ink mb-3">Top sellers</h3>
        {stats.topSellers.length === 0 ? (
          <p className="text-sm text-fog">No confirmed sales in this period yet.</p>
        ) : (
          <ol className="space-y-3">
            {stats.topSellers.map((s, i) => (
              <li key={s.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-surface text-fog text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{s.name}</p>
                  <p className="text-xs text-fog">{s.quantity} sold</p>
                </div>
                <span className="text-sm font-bold text-ink tabular-nums shrink-0">
                  RM {s.revenue.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-center text-xs text-fog">
        Revenue counts only {noun} with a confirmed payment.
      </p>
    </div>
  )
}

function StatCard({ label, value, sub, accent }: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-brand/30 bg-brand/5' : 'border-border bg-white'}`}>
      <p className="text-[11px] text-fog font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${accent ? 'text-brand' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-[11px] text-fog mt-0.5">{sub}</p>}
    </div>
  )
}
