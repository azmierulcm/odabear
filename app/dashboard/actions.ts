'use server'

import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

// Vendor-authenticated: returns a short-lived signed URL for an order's payment receipt.
//
// Receipts live in the PRIVATE `payment-receipts` bucket, so they can only be read
// through a signed URL minted server-side — and only after we confirm the logged-in
// vendor actually owns the order the receipt belongs to.
export async function getReceiptSignedUrl(
  orderId: string,
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { url: null, error: 'Please log in again.' }

  const { data: order } = await adminSupabase
    .from('orders')
    .select('payment_proof_url, vendor_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order?.payment_proof_url) return { url: null, error: 'No receipt uploaded yet.' }

  // Ownership check: the order's vendor must belong to this logged-in user.
  const { data: vendor } = await adminSupabase
    .from('vendors')
    .select('id')
    .eq('id', order.vendor_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!vendor) return { url: null, error: 'Not authorised.' }

  const { data, error } = await adminSupabase.storage
    .from('payment-receipts')
    .createSignedUrl(order.payment_proof_url, 600) // 10-minute link
  if (error || !data) return { url: null, error: 'Could not open the receipt.' }

  return { url: data.signedUrl }
}
