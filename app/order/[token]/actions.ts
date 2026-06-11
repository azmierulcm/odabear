'use server'

import { adminSupabase } from '@/lib/supabase/admin'
import { notifyReceiptUploaded } from '@/lib/email/vendor-alerts'
import type { PaymentStatus } from '@/types/menu'

// The order_token IS the authorization here — knowing it (an unguessable UUID from
// the customer's own order link) is what grants the right to act on that one order.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitPaymentReceipt(
  token: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test(token)) return { ok: false, error: 'Invalid order link.' }

  const { data: order } = await adminSupabase
    .from('orders').select('id, vendor_id, payment_status, short_order_id, total_price, customer_name').eq('order_token', token).maybeSingle()
  if (!order) return { ok: false, error: 'Order not found.' }
  if (order.payment_status === 'confirmed') return { ok: false, error: 'This order is already confirmed.' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'Please choose a receipt image.' }
  if (!file.type.startsWith('image/')) return { ok: false, error: 'Please upload an image file (photo or screenshot).' }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'File too large. Max 5 MB.' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${order.vendor_id}/${order.id}_${Date.now()}.${ext}`

  // Private bucket — store the path; the vendor dashboard reads it via a signed URL.
  const { error: upErr } = await adminSupabase.storage
    .from('payment-receipts').upload(path, file, { upsert: true })
  if (upErr) return { ok: false, error: 'Could not upload your receipt. Please try again.' }

  const { error: updErr } = await adminSupabase
    .from('orders')
    .update({
      payment_proof_url: path,
      payment_submitted_at: new Date().toISOString(),
      payment_status: 'submitted',
    })
    .eq('id', order.id)
  if (updErr) return { ok: false, error: 'Could not save your receipt. Please try again.' }

  await notifyReceiptUploaded(order.vendor_id, {
    type:         'order',
    ref:          order.short_order_id ?? order.id.slice(0, 8).toUpperCase(),
    customerName: order.customer_name,
    total:        Number(order.total_price ?? 0),
  })

  return { ok: true }
}

export async function refreshPaymentStatus(token: string): Promise<PaymentStatus | null> {
  if (!UUID_RE.test(token)) return null
  const { data } = await adminSupabase
    .from('orders').select('payment_status').eq('order_token', token).maybeSingle()
  return (data?.payment_status as PaymentStatus) ?? null
}
