'use server'

import { z } from 'zod'
import { adminSupabase } from '@/lib/supabase/admin'
import { notifyNewOrder } from '@/lib/email/vendor-alerts'
import { computeDeliveryFee } from '@/lib/delivery'

// ─── Validation schema ────────────────────────────────────────

const CheckoutSchema = z.object({
  vendor_id:        z.string().uuid('Invalid vendor.'),
  customer_name:    z.string().min(1, 'Name is required.').max(100),
  customer_phone:   z.string().max(20).optional().default(''),
  notes:            z.string().max(500).optional().default(''),
  delivery_type:    z.enum(['pickup', 'delivery']),
  delivery_address: z.string().max(300).optional().default(''),
  items: z.array(z.object({
    id:       z.string().uuid('Invalid item.'),
    name:     z.string().min(1).max(100),
    price:    z.number().positive().max(10000),
    quantity: z.number().int().positive().max(99),
  })).min(1, 'Cart is empty.').max(50),
  total_price: z.number().positive().max(100000),
})

export type CheckoutPayload = z.input<typeof CheckoutSchema>

export interface CheckoutItem {
  name: string
  price: number
  quantity: number
}

export interface CheckoutResult {
  success: boolean
  short_order_id?: string
  total_price?: number
  order_token?: string
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────

function makeShortOrderId(): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `ORD-${suffix}`
}

function isMissingColumnError(msg: string): boolean {
  return msg.includes('column') || msg.includes('42703') || msg.includes('does not exist')
}

// ─── Server Action ────────────────────────────────────────────

export async function checkoutToWhatsApp(
  raw: unknown,
): Promise<CheckoutResult> {
  // 1. Validate & sanitise all inputs
  const parsed = CheckoutSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid order data.'
    return { success: false, error: firstError }
  }
  const payload = parsed.data

  // 2. Verify the vendor is active before doing any pricing work.
  //    We do this explicitly in code rather than relying on an RLS INSERT policy,
  //    because customers are anonymous (anon role) and Postgres's INSERT … RETURNING
  //    requires *both* INSERT and SELECT RLS policies to pass. There is no anon
  //    SELECT policy on orders (vendors only), so using the user-scoped client with
  //    .select() after insert always fails for unauthenticated customers — even when
  //    the INSERT policy itself would allow it. Using adminSupabase here bypasses RLS
  //    entirely; the vendor-active guard below replaces the safety that RLS provided.
  const { data: vendorCheck } = await adminSupabase
    .from('vendors')
    .select('id, delivery_fee, free_delivery_min')
    .eq('id', payload.vendor_id)
    .eq('is_active', true)
    .maybeSingle()
  if (!vendorCheck) {
    return { success: false, error: 'This shop is not accepting orders right now.' }
  }

  // 3. Re-price the cart from the database — never trust client prices.
  //    Items must exist, be available, and belong to this vendor (via category).
  const cartIds = [...new Set(payload.items.map((i) => i.id))]
  const { data: dbItems, error: itemsErr } = await adminSupabase
    .from('items')
    .select('id, name, price, is_available, categories!inner(vendor_id)')
    .in('id', cartIds)
    .eq('categories.vendor_id', payload.vendor_id)
  if (itemsErr) {
    console.error('[checkoutToWhatsApp] item lookup failed:', itemsErr.message)
    return { success: false, error: 'We could not check your cart. Please try again.' }
  }
  const priceById = new Map((dbItems ?? []).map((i) => [i.id, i]))

  const pricedItems: { name: string; price: number; quantity: number }[] = []
  let subtotal = 0
  for (const line of payload.items) {
    const dbItem = priceById.get(line.id)
    if (!dbItem) {
      return { success: false, error: `"${line.name}" is no longer on the menu. Please refresh and try again.` }
    }
    if (!dbItem.is_available) {
      return { success: false, error: `"${dbItem.name}" is sold out. Please remove it from your cart.` }
    }
    const price = Number(dbItem.price)
    pricedItems.push({ name: dbItem.name, price, quantity: line.quantity })
    subtotal += price * line.quantity
  }
  subtotal = Math.round(subtotal * 100) / 100

  // Re-derive the delivery fee from the vendor's own config — never trust the
  // client's delivery fee.
  const deliveryFee = payload.delivery_type === 'delivery'
    ? computeDeliveryFee(subtotal, vendorCheck)
    : 0
  const derivedTotal = Math.round((subtotal + deliveryFee) * 100) / 100

  // If the total the customer saw no longer matches (vendor changed a price
  // mid-session), stop and ask them to refresh rather than charging a surprise.
  if (Math.abs(derivedTotal - payload.total_price) > 0.01) {
    return { success: false, error: 'Prices have been updated. Please refresh and try again.' }
  }

  // 4. Rate limit — max 3 orders per customer per vendor per 60 seconds
  const windowStart = new Date(Date.now() - 60_000).toISOString()
  const phone = payload.customer_phone.trim()
  const rateLimitQuery = adminSupabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', payload.vendor_id)
    .gte('created_at', windowStart)
  const { count: recentCount } = phone
    ? await rateLimitQuery.eq('customer_phone', phone)
    : await rateLimitQuery.eq('customer_name', payload.customer_name.trim())
  if ((recentCount ?? 0) >= 3) {
    return { success: false, error: 'Too many orders. Please wait a minute and try again.' }
  }

  const short_order_id = makeShortOrderId()

  // ── Attempt 1: full insert with all columns ───────────────
  const { data, error } = await adminSupabase
    .from('orders')
    .insert({
      vendor_id:        payload.vendor_id,
      short_order_id,
      customer_name:    payload.customer_name.trim(),
      customer_phone:   payload.customer_phone.trim() || null,
      cart_items:       pricedItems,
      items:            pricedItems,
      total_price:      derivedTotal,
      delivery_fee:     deliveryFee,
      delivery_type:    payload.delivery_type,
      delivery_address: payload.delivery_type === 'delivery'
                          ? payload.delivery_address.trim()
                          : null,
      notes:            payload.notes.trim() || null,
      status:           'pending',
    })
    .select('short_order_id, total_price, order_token')
    .single()

  if (!error) {
    await notifyNewOrder(payload.vendor_id, {
      shortOrderId:    data.short_order_id as string,
      customerName:    payload.customer_name.trim(),
      customerPhone:   payload.customer_phone.trim() || null,
      total:           derivedTotal,
      deliveryFee,
      items:           pricedItems,
      deliveryType:    payload.delivery_type,
      deliveryAddress: payload.delivery_type === 'delivery' ? payload.delivery_address.trim() : null,
      notes:           payload.notes.trim() || null,
    })
    return {
      success:        true,
      short_order_id: data.short_order_id as string,
      total_price:    Number(data.total_price),
      order_token:    data.order_token as string,
    }
  }

  console.error('[checkoutToWhatsApp] Full insert failed:', error.message)

  // ── Attempt 2: fallback to legacy columns ─────────────────
  if (isMissingColumnError(error.message)) {
    const deliveryNote = payload.delivery_type === 'delivery'
      ? `Delivery to: ${payload.delivery_address.trim()}.`
      : 'Self pickup.'

    const notesWithDelivery = [deliveryNote, payload.notes.trim()]
      .filter(Boolean)
      .join(' | ')

    const { error: fallbackError } = await adminSupabase
      .from('orders')
      .insert({
        vendor_id:      payload.vendor_id,
        customer_name:  payload.customer_name.trim(),
        customer_phone: payload.customer_phone.trim() || null,
        items:          pricedItems,
        total_price:    derivedTotal,
        notes:          notesWithDelivery || null,
        status:         'pending',
      })

    if (fallbackError) {
      console.error('[checkoutToWhatsApp] Fallback insert failed:', fallbackError.message)
      return { success: false, error: 'We could not place your order right now. Please try again or message the vendor directly on WhatsApp.' }
    }

    await notifyNewOrder(payload.vendor_id, {
      shortOrderId:    short_order_id,
      customerName:    payload.customer_name.trim(),
      customerPhone:   payload.customer_phone.trim() || null,
      total:           derivedTotal,
      deliveryFee,
      items:           pricedItems,
      deliveryType:    payload.delivery_type,
      deliveryAddress: payload.delivery_type === 'delivery' ? payload.delivery_address.trim() : null,
      notes:           payload.notes.trim() || null,
    })
    return {
      success:        true,
      short_order_id,
      total_price:    derivedTotal,
    }
  }

  return { success: false, error: 'We could not place your order right now. Please try again or message the vendor directly on WhatsApp.' }
}
