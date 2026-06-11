'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { toDynamicPayload } from '@/lib/duitnowQr'
import { compressImage } from '@/lib/compressImage'
import { SUBSCRIPTION_PRICE, daysLeft, fmtDate, type SubStatus } from '@/lib/subscription'
import { submitSubscriptionPayment } from './subscription-actions'
import type { Vendor } from '@/types/menu'

interface Props {
  vendor: Vendor
  billing: { payload: string | null; name: string; qrUrl: string | null }
  onActivated: (patch: Partial<Vendor>) => void
}

const AMOUNT = SUBSCRIPTION_PRICE.toFixed(2)

export default function SubscriptionCard({ vendor, billing, onActivated }: Props) {
  const status   = (vendor.subscription_status ?? null) as SubStatus
  const expiry   = vendor.trial_ends_at ?? null
  const left     = daysLeft(expiry)

  const [open,      setOpen]      = useState(false)
  const [qr,        setQr]        = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [paidUntil, setPaidUntil] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Render the amount-prefilled dynamic QR once the panel opens.
  useEffect(() => {
    if (!open || !billing.payload || qr) return
    let cancelled = false
    ;(async () => {
      try {
        const payload = toDynamicPayload(billing.payload!, {
          amount:    SUBSCRIPTION_PRICE,
          reference: `SUB${vendor.id.slice(0, 6).toUpperCase()}`,
        })
        const url = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', width: 480, margin: 1 })
        if (!cancelled) setQr(url)
      } catch {
        if (!cancelled) setQr(null)
      }
    })()
    return () => { cancelled = true }
  }, [open, billing.payload, qr, vendor.id])

  const handleReceipt = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', compressed)
      const res = await submitSubscriptionPayment(fd)
      if (res.ok && res.expiresAt) {
        setPaidUntil(res.expiresAt)
        onActivated({
          subscription_status: 'active',
          is_active: true,
          trial_ends_at: res.expiresAt,
        })
      } else {
        setError(res.error ?? 'Upload failed. Please try again.')
      }
    } catch {
      setError('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  const saveQr = () => {
    if (!qr) return
    const a = document.createElement('a')
    a.href = qr
    a.download = 'jomoda-subscription-qr.png'
    document.body.appendChild(a); a.click(); a.remove()
  }

  // ── Status badge ──
  const badge =
    status === 'active'
      ? { cls: 'bg-green-50 text-green-700 border-green-200', label: `Active${expiry ? ` · until ${fmtDate(expiry)}` : ''}` }
    : status === 'trial'
      ? { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: `Free trial${expiry ? ` · until ${fmtDate(expiry)}` : ''}` }
      : { cls: 'bg-red-50 text-brand border-red-200', label: 'Expired — shop hidden' }

  const showWarning = status === 'expired' || (left !== null && left <= 5)

  if (paidUntil) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-1">
        <p className="text-3xl">&#x1F389;</p>
        <p className="font-bold text-green-800">Payment received!</p>
        <p className="text-sm text-green-700">
          Your shop is active until <span className="font-semibold">{fmtDate(paidUntil)}</span>.
        </p>
        <p className="text-xs text-green-600 pt-1">We&apos;ll verify your payment shortly. Thank you!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Subscription</h2>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-ink leading-none">
            <span className="text-base font-semibold text-fog align-super">RM</span>{SUBSCRIPTION_PRICE}
            <span className="text-sm font-medium text-fog">/month</span>
          </p>
          <p className="text-xs text-fog mt-1">0% commission · cancel anytime</p>
        </div>
        {status === 'active' && left !== null && left > 0 && (
          <p className="text-xs text-fog">{left} day{left !== 1 ? 's' : ''} left</p>
        )}
      </div>

      {showWarning && (
        <p className="text-sm text-brand bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {status === 'expired'
            ? 'Your shop is currently hidden from customers. Renew to go live again.'
            : `Your access ends in ${left} day${left !== 1 ? 's' : ''}. Renew now to stay live.`}
        </p>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity"
        >
          {status === 'active' ? 'Renew for another month' : `Pay RM${SUBSCRIPTION_PRICE} & go live`}
        </button>
      ) : (
        <div className="border border-border rounded-xl p-4 space-y-4">
          {!billing.payload && !billing.qrUrl ? (
            <p className="text-sm text-fog">
              Online payment isn&apos;t set up yet. Please contact Jomoda support to renew.
            </p>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-ink">Pay to {billing.name}</p>
                <p className="text-xs text-fog mt-0.5">DuitNow · RM {AMOUNT}</p>
              </div>

              {qr ? (
                <div className="flex flex-col items-center">
                  <img src={qr} alt="Subscription payment QR" className="w-52 h-52 object-contain rounded-xl border border-border bg-white" />
                  <p className="text-xs text-green-700 font-semibold mt-2 text-center">
                    RM {AMOUNT} is already filled in &mdash; just scan &amp; pay
                  </p>
                  <button onClick={saveQr} className="text-xs font-semibold text-ink underline underline-offset-2 mt-2">Save QR</button>
                </div>
              ) : billing.qrUrl ? (
                <div className="flex flex-col items-center">
                  <img src={billing.qrUrl} alt="Subscription payment QR" className="w-48 h-48 object-contain rounded-xl border border-border bg-white" />
                  <p className="text-xs text-fog mt-2 text-center">Scan and enter <span className="font-bold text-ink">RM {AMOUNT}</span></p>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-fog">Preparing QR…</div>
              )}

              <ol className="space-y-2 text-xs text-fog">
                <li>1. Scan the QR with your banking app and pay <span className="font-semibold text-ink">RM {AMOUNT}</span>.</li>
                <li>2. Screenshot the successful payment receipt.</li>
                <li>3. Upload it below — your shop goes live instantly.</li>
              </ol>

              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : "I've paid — upload receipt"}
              </button>
              {error && <p className="text-xs text-brand">{error}</p>}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleReceipt(e.target.files[0]); e.target.value = '' }}
              />
            </>
          )}
          <button onClick={() => setOpen(false)} className="w-full text-xs font-semibold text-fog underline underline-offset-2">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
