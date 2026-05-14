'use client'

import { useState } from 'react'
import { toggleVendorActive, adminCreateListing } from './actions'
import type { VendorStat } from './page'

// ── Create Listing Form ───────────────────────────────────────

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant / F&B' },
  { value: 'retail',     label: 'Retail / Shop' },
  { value: 'booking',    label: 'Homestay / Booking' },
] as const

function CreateListingPanel({ onCreated }: { onCreated: (vendorId: string) => void }) {
  const [open, setOpen]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName]               = useState('')
  const [slug, setSlug]               = useState('')
  const [businessType, setBusinessType] = useState<'restaurant' | 'retail' | 'booking'>('restaurant')
  const [phone, setPhone]             = useState('')
  const [description, setDescription] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const handleNameChange = (v: string) => {
    setName(v)
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      const { vendorId, inviteSent } = await adminCreateListing({
        name, slug, business_type: businessType, phone_number: phone, description, customer_email: customerEmail,
      })
      setSuccess(
        inviteSent
          ? `Listing created and invite email sent to ${customerEmail}.`
          : 'Listing created. No customer email — link the account later via Edit listing.'
      )
      onCreated(vendorId)
      setName(''); setSlug(''); setPhone(''); setDescription(''); setCustomerEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30'

  return (
    <div className="bg-white rounded-2xl border border-border mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface/60 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-ink">Create listing for a customer</p>
          <p className="text-xs text-fog mt-0.5">For premium customers — builds and publishes their page on their behalf</p>
        </div>
        <span className="text-fog text-lg">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            const tag = (e.target as HTMLElement).tagName
            if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON') e.preventDefault()
          }}
          className="border-t border-border px-6 py-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Business Name <span className="text-brand">*</span></label>
              <input required value={name} onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Tepi Pantai Chalet" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">URL Slug <span className="text-brand">*</span></label>
              <input required value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="tepi-pantai-chalet" className={inp} />
              <p className="text-xs text-gray-400 mt-1">jomoda.com/{slug || '…'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Business Type <span className="text-brand">*</span></label>
              <select required value={businessType} onChange={(e) => setBusinessType(e.target.value as typeof businessType)} className={inp}>
                {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number <span className="text-brand">*</span></label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 60123456789" className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="Tell customers about this business…" className={`${inp} resize-y`} />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-semibold text-blue-700">Customer Email (optional)</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@email.com" className={inp} />
            <p className="text-xs text-blue-600">
              If provided, a Supabase account is created and an invite email is sent automatically. The customer clicks the link to set their password and access their dashboard.
            </p>
          </div>

          {error   && <p className="text-sm text-brand bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2.5">{success}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-brand text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-brand/90 transition-colors">
              {busy ? 'Creating…' : 'Create listing'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-5 py-2 text-sm font-semibold text-fog hover:text-ink transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function daysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function TrialBadge({ vendor }: { vendor: VendorStat }) {
  const status = vendor.subscription_status

  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        ★ Subscribed
      </span>
    )
  }

  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-brand border border-red-200">
        Trial ended
      </span>
    )
  }

  // Trial in progress
  const days = daysRemaining(vendor.trial_ends_at)
  if (days === null) return null

  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-brand border border-red-200">
        Trial ended
      </span>
    )
  }

  const urgent = days <= 5
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
      urgent
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-surface text-fog border-border'
    }`}>
      {days}d left
    </span>
  )
}

// ── Toggle switch ─────────────────────────────────────────────

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-brand' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Main component ────────────────────────────────────────────

export default function AdminClient({ vendors: initial }: { vendors: VendorStat[] }) {
  const [vendors, setVendors] = useState<VendorStat[]>(initial)
  const [busy, setBusy]       = useState<string | null>(null)
  const [query, setQuery]     = useState('')

  const handleListingCreated = (vendorId: string) => {
    window.location.href = `/admin/vendor/${vendorId}`
  }

  const filtered = query.trim()
    ? vendors.filter((v) => {
        const q = query.trim().toLowerCase()
        return (
          v.name.toLowerCase().includes(q) ||
          v.slug.toLowerCase().includes(q) ||
          v.phone_number.includes(q) ||
          (v.vendor_number?.toString() ?? '').includes(q)
        )
      })
    : vendors

  const handleToggle = async (vendor: VendorStat) => {
    setBusy(vendor.id)
    const next = !vendor.is_active

    // Optimistic update
    setVendors((prev) =>
      prev.map((v) => (v.id === vendor.id ? { ...v, is_active: next } : v))
    )
    try {
      await toggleVendorActive(vendor.id, next)
    } catch {
      // Revert on error
      setVendors((prev) =>
        prev.map((v) => (v.id === vendor.id ? { ...v, is_active: vendor.is_active } : v))
      )
    } finally {
      setBusy(null)
    }
  }

  return (<>
    <CreateListingPanel onCreated={handleListingCreated} />

    <div className="mb-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by listing #, name, slug or phone…"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </div>

    {vendors.length === 0 ? (
      <div className="bg-white rounded-2xl border border-border p-12 text-center text-fog text-sm">
        No vendors registered yet.
      </div>
    ) : filtered.length === 0 ? (
      <div className="bg-white rounded-2xl border border-border p-12 text-center text-fog text-sm">
        No listings match "{query}".
      </div>
    ) : (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-fog uppercase tracking-widest w-12">
              #
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-fog uppercase tracking-widest">
              Vendor
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-fog uppercase tracking-widest hidden sm:table-cell">
              Menu URL
            </th>
            <th className="px-6 py-3.5 text-center text-xs font-semibold text-fog uppercase tracking-widest hidden md:table-cell">
              Trial / Plan
            </th>
            <th className="px-6 py-3.5 text-center text-xs font-semibold text-fog uppercase tracking-widest">
              Items
            </th>
            <th className="px-6 py-3.5 text-center text-xs font-semibold text-fog uppercase tracking-widest">
              Published
            </th>
            <th className="px-6 py-3.5 text-right text-xs font-semibold text-fog uppercase tracking-widest">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface">
          {filtered.map((vendor) => (
            <tr key={vendor.id} className="hover:bg-surface/60 transition-colors">
              {/* Listing number */}
              <td className="px-4 py-4 text-center">
                <span className="text-xs font-mono font-bold text-fog">
                  {vendor.vendor_number != null ? `#${vendor.vendor_number}` : '—'}
                </span>
              </td>
              {/* Name + phone */}
              <td className="px-6 py-4">
                <p className="font-semibold text-ink">{vendor.name}</p>
                <p className="text-xs text-fog mt-0.5">{vendor.phone_number}</p>
              </td>

              {/* Slug link */}
              <td className="px-6 py-4 hidden sm:table-cell">
                <a
                  href={`/${vendor.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-medium underline underline-offset-2"
                >
                  /{vendor.slug}
                </a>
              </td>

              {/* Trial / subscription badge */}
              <td className="px-6 py-4 text-center hidden md:table-cell">
                <TrialBadge vendor={vendor} />
              </td>

              {/* Item count */}
              <td className="px-6 py-4 text-center">
                <span className="font-semibold text-ink">{vendor.item_count}</span>
              </td>

              {/* Published toggle */}
              <td className="px-6 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <ToggleSwitch
                    checked={vendor.is_active}
                    disabled={busy === vendor.id}
                    onChange={() => handleToggle(vendor)}
                  />
                  <span className={`text-xs font-semibold ${vendor.is_active ? 'text-green-600' : 'text-fog'}`}>
                    {busy === vendor.id ? '…' : vendor.is_active ? 'Live' : 'Hidden'}
                  </span>
                </div>
              </td>

              {/* Edit link */}
              <td className="px-6 py-4 text-right">
                <a
                  href={`/admin/vendor/${vendor.id}`}
                  className="text-sm font-semibold text-ink underline underline-offset-2 hover:text-fog transition-colors"
                >
                  Edit listing
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    )}
  </>)
}
