'use server'

import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notifyReceiptUploaded } from '@/lib/email/vendor-alerts'
import type { PaymentStatus } from '@/types/menu'

// The booking_token IS the authorisation here — an unguessable UUID from the
// customer's own booking link is what grants the right to act on that booking.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitBookingReceipt(
  token: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test(token)) return { ok: false, error: 'Invalid booking link.' }

  const { data: booking } = await adminSupabase
    .from('bookings')
    .select('id, vendor_id, payment_status, payment_proof_url, short_booking_id, total_price, customer_name')
    .eq('booking_token', token)
    .maybeSingle()
  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (booking.payment_status === 'confirmed') {
    return { ok: false, error: 'This booking payment is already confirmed.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'Please choose a receipt image.' }
  if (!file.type.startsWith('image/')) return { ok: false, error: 'Please upload an image file (photo or screenshot).' }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'File too large. Max 5 MB.' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${booking.vendor_id}/${booking.id}_${Date.now()}.${ext}`

  // Private bucket — store the path; the vendor dashboard reads it via a signed URL.
  const { error: upErr } = await adminSupabase.storage
    .from('payment-receipts')
    .upload(path, file, { upsert: true })
  if (upErr) return { ok: false, error: 'Could not upload your receipt. Please try again.' }

  const { error: updErr } = await adminSupabase
    .from('bookings')
    .update({
      payment_proof_url:    path,
      payment_submitted_at: new Date().toISOString(),
      payment_status:       'submitted',
    })
    .eq('id', booking.id)
  if (updErr) return { ok: false, error: 'Could not save your receipt. Please try again.' }

  if (booking.payment_proof_url) {
    await adminSupabase.storage.from('payment-receipts').remove([booking.payment_proof_url])
  }

  await notifyReceiptUploaded(booking.vendor_id, {
    type:         'booking',
    ref:          booking.short_booking_id ?? booking.id.slice(0, 8).toUpperCase(),
    customerName: booking.customer_name,
    total:        Number(booking.total_price ?? 0),
  })

  return { ok: true }
}

export async function refreshBookingPaymentStatus(token: string): Promise<PaymentStatus | null> {
  if (!UUID_RE.test(token)) return null
  const { data } = await adminSupabase
    .from('bookings')
    .select('payment_status')
    .eq('booking_token', token)
    .maybeSingle()
  return (data?.payment_status as PaymentStatus) ?? null
}

// Vendor-authenticated: returns a short-lived signed URL for a booking's payment receipt.
// Only callable from the dashboard (requires a logged-in vendor session).
export async function getBookingReceiptSignedUrl(
  bookingId: string,
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { url: null, error: 'Please log in again.' }

  const { data: booking } = await adminSupabase
    .from('bookings')
    .select('payment_proof_url, vendor_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (!booking?.payment_proof_url) return { url: null, error: 'No receipt uploaded yet.' }

  // Ownership check: the booking's vendor must belong to this logged-in user.
  const { data: vendor } = await adminSupabase
    .from('vendors')
    .select('id')
    .eq('id', booking.vendor_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!vendor) return { url: null, error: 'Not authorised.' }

  const { data, error } = await adminSupabase.storage
    .from('payment-receipts')
    .createSignedUrl(booking.payment_proof_url, 600) // 10-minute link
  if (error || !data) return { url: null, error: 'Could not open the receipt.' }

  return { url: data.signedUrl }
}
