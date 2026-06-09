'use client'

import { useEffect, useRef, useState } from 'react'
import { compressImage } from '@/lib/compressImage'
import type { OrderLineItem, PaymentMethod, PaymentStatus } from '@/types/menu'
import { submitPaymentReceipt, refreshPaymentStatus } from './actions'

interface PaymentView { method: PaymentMethod; dynamicQr?: string }

interface Props {
  token: string
  shortOrderId: string
  customerFirstName: string
  vendorName: string
  vendorLogo: string | null
  total: number
  items: OrderLineItem[]
  initialPaymentStatus: PaymentStatus
  payments: PaymentView[]
  waUrl: string
  notifyPaidUrl: string
}

const BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  awaiting:  { label: 'Payment needed',         cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  submitted: { label: 'Checking your payment…', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  confirmed: { label: 'Payment confirmed ✓',    cls: 'bg-green-50 text-green-700 border-green-200' },
  rejected:  { label: 'Payment problem',        cls: 'bg-red-50 text-brand border-red-200' },
}

export default function OrderStatusClient({
  token, shortOrderId, customerFirstName, vendorName, vendorLogo,
  total, items, initialPaymentStatus, payments, waUrl, notifyPaidUrl,
}: Props) {
  const [status, setStatus] = useState<PaymentStatus>(initialPaymentStatus)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showStatic, setShowStatic] = useState<Record<number, boolean>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const amountStr = total.toFixed(2)

  // Poll for the vendor's decision only while we're waiting on them.
  useEffect(() => {
    if (status !== 'submitted') return
    const id = setInterval(async () => {
      const s = await refreshPaymentStatus(token)
      if (s && s !== status) setStatus(s)
    }, 12000)
    return () => clearInterval(id)
  }, [status, token])

  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(amountStr)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable — amount is shown anyway */ }
  }

  const saveQr = (dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `pay-${shortOrderId}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleReceipt = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', compressed)
      const res = await submitPaymentReceipt(token, fd)
      if (res.ok) setStatus('submitted')
      else setUploadError(res.error ?? 'Upload failed. Please try again.')
    } catch {
      setUploadError('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          {vendorLogo
            ? <img src={vendorLogo} alt={vendorName} className="w-14 h-14 rounded-full object-cover mx-auto border border-border" />
            : <div className="w-14 h-14 rounded-full bg-brand text-white font-bold text-lg flex items-center justify-center mx-auto">{vendorName[0]?.toUpperCase()}</div>}
          <h1 className="text-xl font-bold text-ink pt-1">Thank you, {customerFirstName}!</h1>
          <p className="text-sm text-fog">Your order with <span className="font-semibold text-ink">{vendorName}</span> is in.</p>
        </div>

        {/* Reference + status */}
        <div className="bg-white rounded-2xl border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-fog">Order reference</p>
            <p className="font-mono font-bold text-ink tracking-wider">{shortOrderId}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${BADGE[status].cls}`}>{BADGE[status].label}</span>
        </div>

        {/* Confirmed banner */}
        {status === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-1">
            <p className="text-3xl">🎉</p>
            <p className="font-bold text-green-800">Payment confirmed!</p>
            <p className="text-sm text-green-700">{vendorName} is preparing your order.</p>
          </div>
        )}

        {/* Items + total */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-bold text-ink">Your order</h2>
          {items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-ink">{it.quantity}× {it.name}</span>
              <span className="text-fog tabular-nums">RM {(it.price * it.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-ink pt-2 border-t border-border">
            <span>Total</span>
            <span className="tabular-nums">RM {amountStr}</span>
          </div>
        </div>

        {/* Payment + upload (hidden once confirmed) */}
        {status !== 'confirmed' && (
          <>
            {status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-brand">
                There was a problem with your payment. Please check you paid <span className="font-bold">RM {amountStr}</span> and upload your receipt again.
              </div>
            )}

            {payments.length > 0 ? (
              <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-ink">How to pay</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-fog">Pay <span className="font-bold text-ink">RM {amountStr}</span></p>
                    <button onClick={copyAmount} className="text-xs font-semibold text-brand underline underline-offset-2">
                      {copied ? 'Copied ✓' : 'Copy amount'}
                    </button>
                  </div>
                </div>
                {payments.map((p, i) => (
                  <PaymentBlock key={i} p={p} amountStr={amountStr}
                    showStatic={!!showStatic[i]}
                    onToggleStatic={() => setShowStatic((s) => ({ ...s, [i]: !s[i] }))}
                    onSaveQr={saveQr} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-border p-5 text-sm text-fog">
                Message {vendorName} below to arrange payment.
              </div>
            )}

            {/* Receipt upload */}
            <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
              <h2 className="text-sm font-bold text-ink">Upload your receipt</h2>
              {status === "submitted" ? (
                <div className="space-y-3">
                  <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    Receipt received &#10003; &mdash; waiting for {vendorName} to confirm your payment.
                  </p>
                  {/* Single combined button: sends vendor a rich order summary + receipt link */}
                  <a href={notifyPaidUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors">
                    &#128242; Send order summary to {vendorName}
                  </a>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full text-xs font-semibold text-fog underline underline-offset-2 disabled:opacity-50 text-center">
                    {uploading ? "Uploading..." : "Uploaded the wrong one? Upload again"}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-fog">After paying, upload a screenshot of your receipt so {vendorName} can confirm.</p>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-1 text-fog hover:border-ink hover:text-ink transition-colors disabled:opacity-50">
                    <span className="text-2xl">{uploading ? "⏳" : "📤"}</span>
                    <span className="text-xs font-semibold">{uploading ? "Uploading..." : "I’ve paid — upload receipt"}</span>
                  </button>
                </>
              )}
              {uploadError && <p className="text-xs text-brand">{uploadError}</p>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleReceipt(e.target.files[0]); e.target.value = '' }} />
            </div>
          </>
        )}

        {/* Contact — hidden when status is submitted (the richer notify button above covers it) */}
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className={`w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors ${status === 'submitted' ? 'hidden' : ''}`}>
          Message {vendorName} on WhatsApp
        </a>

        <p className="text-center text-xs text-fog">Bookmark this page to check your order status anytime.</p>
      </div>
    </div>
  )
}

function PaymentBlock({ p, amountStr, showStatic, onToggleStatic, onSaveQr }: {
  p: PaymentView
  amountStr: string
  showStatic: boolean
  onToggleStatic: () => void
  onSaveQr: (dataUrl: string) => void
}) {
  const m = p.method
  const label = m.type === 'duitnow' ? 'DuitNow' : m.type === 'paynow' ? 'PayNow' : 'Bank Transfer'

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-fog">{label}</p>

      {(m.type === 'duitnow' || m.type === 'paynow') && (
        <div>
          <p className="text-sm font-semibold text-ink">{m.recipient_name}</p>
          <p className="text-sm text-fog font-mono">{m.id}</p>
        </div>
      )}
      {m.type === 'bank' && (
        <div>
          <p className="text-sm font-semibold text-ink">{m.bank_name}</p>
          <p className="text-sm text-fog">Account: <span className="font-mono font-semibold text-ink">{m.account_number}</span></p>
          <p className="text-sm text-fog">{m.account_name}</p>
        </div>
      )}

      {/* Preferred: dynamic amount-filled QR */}
      {p.dynamicQr && !showStatic && (
        <div className="flex flex-col items-center pt-1">
          <img src={p.dynamicQr} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl border border-border bg-white" />
          <p className="text-xs text-green-700 font-semibold mt-2 text-center">RM {amountStr} is already filled in — just scan &amp; confirm</p>
          <div className="flex gap-4 mt-2">
            <button onClick={() => onSaveQr(p.dynamicQr!)} className="text-xs font-semibold text-ink underline underline-offset-2">Save QR</button>
            {m.qr_url && <button onClick={onToggleStatic} className="text-xs font-semibold text-fog underline underline-offset-2">Scan not working?</button>}
          </div>
        </div>
      )}

      {/* Fallback: original static QR (no payload captured, or user toggled) */}
      {((!p.dynamicQr && m.qr_url) || (showStatic && m.qr_url)) && (
        <div className="flex flex-col items-center pt-1">
          <img src={m.qr_url} alt="Standard QR" className="w-44 h-44 object-contain rounded-xl border border-border bg-white" />
          <p className="text-xs text-fog mt-2 text-center">Scan and enter <span className="font-bold text-ink">RM {amountStr}</span> yourself</p>
          {p.dynamicQr && (
            <button onClick={onToggleStatic} className="text-xs font-semibold text-fog underline underline-offset-2 mt-1">← Back to auto-fill QR</button>
          )}
        </div>
      )}
    </div>
  )
}
