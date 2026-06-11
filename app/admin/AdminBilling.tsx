'use client'

import { useState } from 'react'
import { isDuitNowQr } from '@/lib/duitnowQr'
import { decodeQrFromFile } from '@/lib/decodeQrImage'
import { uploadBillingQr, savePlatformBilling, reviewSubscriptionPayment, getSubscriptionReceiptUrl, type SubPaymentRow } from './actions'

interface Props {
  initialBilling: { payload: string | null; name: string; qrUrl: string | null; fromEnv: boolean }
  initialPayments: SubPaymentRow[]
}

export default function AdminBilling({ initialBilling, initialPayments }: Props) {
  // ── Billing QR config ──
  const [name,    setName]    = useState(initialBilling.name)
  const [payload, setPayload] = useState<string | null>(initialBilling.payload)
  const [qrUrl,   setQrUrl]   = useState<string | null>(initialBilling.qrUrl)
  const [busy,    setBusy]    = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  const handleQr = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setMsg({ ok: false, text: 'File too large. Max 5 MB.' }); return }
    setBusy(true); setMsg(null)
    // Decode in the browser (canvas); upload via the service-role server action
    // (the public-read payment-qr bucket blocks client-side writes).
    const fd = new FormData()
    fd.append('file', file)
    try {
      const [decoded, up] = await Promise.all([
        decodeQrFromFile(file).catch(() => null),
        uploadBillingQr(fd),
      ])
      const newPayload = decoded && isDuitNowQr(decoded) ? decoded : null
      setPayload(newPayload)
      setQrUrl(up.url)
      setMsg(newPayload
        ? { ok: true, text: 'QR read successfully — amount will auto-fill for vendors.' }
        : { ok: false, text: 'Image uploaded, but no DuitNow QR detected. Vendors must enter the amount manually.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Upload failed. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => {
    setBusy(true); setMsg(null)
    try {
      await savePlatformBilling({ payload, name, qrUrl })
      setMsg({ ok: true, text: 'Billing details saved.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed.' })
    }
    setBusy(false)
  }

  // ── Payments list ──
  const [payments, setPayments] = useState(initialPayments)
  const [rowBusy,  setRowBusy]  = useState<string | null>(null)

  const viewReceipt = async (id: string) => {
    setRowBusy(id)
    const res = await getSubscriptionReceiptUrl(id)
    setRowBusy(null)
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    else alert(res.error ?? 'Could not open receipt.')
  }

  const review = async (id: string, decision: 'confirmed' | 'rejected') => {
    if (decision === 'rejected' && !confirm('Reject this payment? The vendor will be set back to expired and hidden.')) return
    setRowBusy(id)
    try {
      await reviewSubscriptionPayment(id, decision)
      setPayments((prev) => prev.map((p) => p.id === id ? { ...p, status: decision } : p))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed.')
    }
    setRowBusy(null)
  }

  const statusPill = (s: SubPaymentRow['status']) =>
    s === 'confirmed' ? 'bg-green-50 text-green-700'
    : s === 'rejected' ? 'bg-red-50 text-red-600'
    : 'bg-blue-50 text-blue-700'

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="mt-10 space-y-8">

      {/* ── Platform billing QR ── */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900">Subscription billing QR</h2>
        <p className="text-sm text-gray-500 mt-1">
          Jomoda&apos;s own DuitNow that vendors pay RM150/month into.
          {initialBilling.fromEnv && ' (Currently set via environment variable — uploading here is ignored unless you remove it.)'}
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-5">
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Recipient name (shown to vendors)</span>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="MUHAMMAD AZMIERUL BIN CHE MAT"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">DuitNow QR image</span>
              <input type="file" accept="image/*" disabled={busy}
                onChange={(e) => { if (e.target.files?.[0]) handleQr(e.target.files[0]); e.target.value = '' }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold" />
            </label>
            <p className="text-xs">
              {payload
                ? <span className="text-green-600 font-semibold">✓ DuitNow payload captured — amount auto-fills</span>
                : qrUrl
                ? <span className="text-amber-600 font-semibold">Static image only — no amount pre-fill</span>
                : <span className="text-gray-400">No QR uploaded yet</span>}
            </p>
            <button onClick={handleSave} disabled={busy}
              className="bg-[#FF385C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 disabled:opacity-50">
              {busy ? 'Saving…' : 'Save billing details'}
            </button>
            {msg && <p className={`text-xs ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
          </div>

          <div className="flex items-center justify-center">
            {qrUrl
              ? <img src={qrUrl} alt="Platform billing QR" className="w-44 h-44 object-contain rounded-xl border border-gray-200" />
              : <div className="w-44 h-44 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 text-center px-3">QR preview</div>}
          </div>
        </div>
      </section>

      {/* ── Vendor payments ── */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900">Subscription payments</h2>
        <p className="text-sm text-gray-500 mt-1">{payments.length} recent payment{payments.length !== 1 ? 's' : ''}. Vendors are auto-activated on upload — reject fakes to revert them.</p>

        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No subscription payments yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.vendor_name}</p>
                  <p className="text-xs text-gray-500">RM {p.amount.toFixed(2)} · {fmt(p.created_at)}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusPill(p.status)}`}>{p.status}</span>
                {p.has_proof && (
                  <button onClick={() => viewReceipt(p.id)} disabled={rowBusy === p.id}
                    className="text-xs font-semibold text-gray-700 underline disabled:opacity-50">View</button>
                )}
                {p.status === 'submitted' && (
                  <>
                    <button onClick={() => review(p.id, 'confirmed')} disabled={rowBusy === p.id}
                      className="text-xs font-semibold text-green-700 disabled:opacity-50">Confirm</button>
                    <button onClick={() => review(p.id, 'rejected')} disabled={rowBusy === p.id}
                      className="text-xs font-semibold text-red-600 disabled:opacity-50">Reject</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
