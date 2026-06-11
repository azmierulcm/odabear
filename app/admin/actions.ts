'use server'

import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

async function verifyAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) throw new Error('Unauthorized')
  return user.email!
}

export async function toggleVendorActive(vendorId: string, isActive: boolean) {
  await verifyAdmin()
  const { error } = await adminSupabase
    .from('vendors')
    .update({ is_active: isActive })
    .eq('id', vendorId)
  if (error) throw new Error(error.message)
}

export async function adminCreateListing(payload: {
  name: string
  slug: string
  business_type: 'restaurant' | 'retail' | 'booking'
  phone_number: string
  description: string
  customer_email: string
}): Promise<{ vendorId: string; inviteSent: boolean }> {
  const email = await verifyAdmin()
  console.log(`[admin] createListing name="${payload.name}" slug="${payload.slug}" by=${email}`)

  let userId: string | null = null
  let inviteSent = false

  if (payload.customer_email.trim()) {
    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(
      payload.customer_email.trim(),
      { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` }
    )
    if (error) throw new Error(`Failed to invite customer: ${error.message}`)
    userId = data.user.id
    inviteSent = true
  }

  const { data: vendor, error: vendorError } = await adminSupabase
    .from('vendors')
    .insert({
      name:                payload.name.trim(),
      slug:                payload.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      business_type:       payload.business_type,
      phone_number:        payload.phone_number.trim(),
      description:         payload.description.trim() || null,
      user_id:             userId,
      is_active:           false,
      subscription_status: 'active',
    })
    .select('id')
    .single()

  if (vendorError) throw new Error(vendorError.message)
  return { vendorId: vendor.id, inviteSent }
}

// ─── Subscription billing (platform DuitNow + vendor payments) ───────────────

// Upload the platform billing QR image. Done server-side with the service role
// because the public-read `payment-qr` bucket blocks client-side writes (RLS).
// The QR is *decoded* in the browser (canvas) — only the storage write moves here.
export async function uploadBillingQr(formData: FormData): Promise<{ url: string }> {
  await verifyAdmin()
  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Please choose a QR image.')
  if (!file.type.startsWith('image/')) throw new Error('Please upload an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('File too large. Max 5 MB.')

  const ext  = file.name.split('.').pop() ?? 'png'
  const path = `platform/billing_${Date.now()}.${ext}`
  const { error: upErr } = await adminSupabase.storage
    .from('payment-qr')
    .upload(path, file, { upsert: true })
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

  const { data: pub } = adminSupabase.storage.from('payment-qr').getPublicUrl(path)
  return { url: pub.publicUrl }
}

export async function savePlatformBilling(input: {
  payload: string | null
  name: string
  qrUrl: string | null
}): Promise<void> {
  await verifyAdmin()
  const { error } = await adminSupabase
    .from('platform_settings')
    .upsert({
      id:              1,
      duitnow_payload: input.payload,
      duitnow_name:    input.name.trim() || 'Odabear',
      qr_url:          input.qrUrl,
      updated_at:      new Date().toISOString(),
    })
  if (error) throw new Error(error.message)
}

export interface SubPaymentRow {
  id: string
  vendor_id: string
  vendor_name: string
  amount: number
  status: 'submitted' | 'confirmed' | 'rejected'
  created_at: string
  has_proof: boolean
}

export async function listSubscriptionPayments(): Promise<SubPaymentRow[]> {
  await verifyAdmin()
  const { data, error } = await adminSupabase
    .from('subscription_payments')
    .select('id, vendor_id, amount, status, created_at, proof_url, vendors(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => {
    const v = r.vendors as { name?: string } | { name?: string }[] | null
    const vendorName = Array.isArray(v) ? v[0]?.name : v?.name
    return {
      id:          r.id as string,
      vendor_id:   r.vendor_id as string,
      vendor_name: vendorName ?? 'Unknown',
      amount:      Number(r.amount),
      status:      r.status as SubPaymentRow['status'],
      created_at:  r.created_at as string,
      has_proof:   !!r.proof_url,
    }
  })
}

// Confirm = mark verified (vendor is already active). Reject = mark rejected
// AND revert the vendor to expired + hidden, since activation was automatic.
export async function reviewSubscriptionPayment(
  paymentId: string,
  decision: 'confirmed' | 'rejected',
): Promise<void> {
  await verifyAdmin()

  const { data: payment, error: fetchErr } = await adminSupabase
    .from('subscription_payments')
    .select('id, vendor_id')
    .eq('id', paymentId)
    .maybeSingle()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!payment) throw new Error('Payment not found.')

  const { error: updErr } = await adminSupabase
    .from('subscription_payments')
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq('id', paymentId)
  if (updErr) throw new Error(updErr.message)

  if (decision === 'rejected') {
    const { error: revertErr } = await adminSupabase
      .from('vendors')
      .update({ subscription_status: 'expired', is_active: false })
      .eq('id', payment.vendor_id)
    if (revertErr) throw new Error(revertErr.message)
  }
}

export async function getSubscriptionReceiptUrl(paymentId: string): Promise<{ url: string | null; error?: string }> {
  await verifyAdmin()
  const { data: payment } = await adminSupabase
    .from('subscription_payments')
    .select('proof_url')
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment?.proof_url) return { url: null, error: 'No receipt on file.' }

  const { data, error } = await adminSupabase.storage
    .from('payment-receipts')
    .createSignedUrl(payment.proof_url, 600)
  if (error || !data) return { url: null, error: 'Could not open the receipt.' }
  return { url: data.signedUrl }
}
