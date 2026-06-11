'use server'

import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { SUBSCRIPTION_PRICE, SUBSCRIPTION_DAYS, extendedExpiry } from '@/lib/subscription'

export interface SubmitSubResult {
  ok: boolean
  expiresAt?: string
  error?: string
}

// Vendor uploads their RM150 payment receipt. Per the chosen flow, the account
// is auto-activated immediately on a successful upload; the admin can still
// review (and reject a fake) afterwards.
export async function submitSubscriptionPayment(formData: FormData): Promise<SubmitSubResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please log in again.' }

  const { data: vendor } = await adminSupabase
    .from('vendors')
    .select('id, user_id, trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!vendor) return { ok: false, error: 'No shop found for your account.' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'Please choose a receipt image.' }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'File too large. Max 5 MB.' }

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `subscriptions/${vendor.id}/${Date.now()}.${ext}`

  const { error: upErr } = await adminSupabase.storage
    .from('payment-receipts')
    .upload(path, file, { upsert: true })
  if (upErr) return { ok: false, error: 'Could not upload your receipt. Please try again.' }

  const { error: insErr } = await adminSupabase
    .from('subscription_payments')
    .insert({
      vendor_id:   vendor.id,
      amount:      SUBSCRIPTION_PRICE,
      proof_url:   path,
      status:      'submitted',
      period_days: SUBSCRIPTION_DAYS,
    })
  if (insErr) return { ok: false, error: 'Could not record your payment. Please try again.' }

  // Auto-activate: extend access and publish the store.
  const expiresAt = extendedExpiry(vendor.trial_ends_at)
  const { error: updErr } = await adminSupabase
    .from('vendors')
    .update({ subscription_status: 'active', is_active: true, trial_ends_at: expiresAt })
    .eq('id', vendor.id)
  if (updErr) return { ok: false, error: 'Payment saved but activation failed. Please contact support.' }

  return { ok: true, expiresAt }
}
