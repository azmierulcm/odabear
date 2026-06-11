'use server'

import { z } from 'zod'
import { adminSupabase } from '@/lib/supabase/admin'
import { notifyNewBooking } from '@/lib/email/vendor-alerts'

// ─── Validation schema ────────────────────────────────────────

const BookingSchema = z.object({
  vendor_id:      z.string().uuid('Invalid vendor.'),
  customer_name:  z.string().min(1, 'Name is required.').max(100),
  customer_phone: z.string().max(20).optional().default(''),
  service_id:     z.string().uuid('Invalid room or service.'),
  service_name:   z.string().min(1).max(100),
  service_price:  z.number().positive().max(100000),
  start_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date.'),
  end_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date.'),
  notes:          z.string().max(500).optional().default(''),
  nights:         z.number().int().positive().max(365),
  total_price:    z.number().positive().max(1000000),
})

export type CreateBookingPayload = z.input<typeof BookingSchema>

export interface CreateBookingResult {
  success: boolean
  booking_token?: string
  short_booking_id?: string
  total_price?: number
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────

function makeShortBookingId(): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
  return `BKG-${suffix}`
}

function isMissingColumnError(msg: string): boolean {
  return msg.includes('column') || msg.includes('42703') || msg.includes('does not exist')
}

// ─── Server Action ────────────────────────────────────────────

export async function createBooking(raw: unknown): Promise<CreateBookingResult> {
  // 1. Validate & sanitise
  const parsed = BookingSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid booking data.' }
  }
  const payload = parsed.data

  // 2. Basic date sanity check
  if (payload.end_date <= payload.start_date) {
    return { success: false, error: 'Check-out must be after check-in.' }
  }

  // 3. Re-derive nights AND price server-side — never trust the client.
  //    Nights come from the dates; the nightly rate comes from the database.
  const nights = Math.round(
    (Date.parse(payload.end_date) - Date.parse(payload.start_date)) / 86_400_000
  )
  if (nights < 1 || nights > 365) {
    return { success: false, error: 'Invalid stay length. Please check your dates.' }
  }

  const { data: service, error: svcErr } = await adminSupabase
    .from('items')
    .select('id, name, price, is_available, blocked_dates, categories!inner(vendor_id)')
    .eq('id', payload.service_id)
    .eq('categories.vendor_id', payload.vendor_id)
    .maybeSingle()
  if (svcErr) {
    console.error('[createBooking] service lookup failed:', svcErr.message)
    return { success: false, error: 'We could not check this service. Please try again.' }
  }
  if (!service) {
    return { success: false, error: 'This room or service is no longer listed. Please refresh and try again.' }
  }
  if (!service.is_available) {
    return { success: false, error: 'This room or service is currently unavailable.' }
  }

  const serviceName  = service.name
  const derivedTotal = Math.round(Number(service.price) * nights * 100) / 100

  // If the total the customer saw no longer matches (rate changed mid-session),
  // stop and ask them to refresh rather than charging a surprise.
  if (Math.abs(derivedTotal - payload.total_price) > 0.01) {
    return { success: false, error: 'Prices have been updated. Please refresh and try again.' }
  }

  // 4. Rate limit — max 3 bookings per customer per vendor per 60 seconds
  const windowStart = new Date(Date.now() - 60_000).toISOString()
  const phone = payload.customer_phone.trim()
  const rateLimitQuery = adminSupabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', payload.vendor_id)
    .gte('created_at', windowStart)
  const { count: recentCount } = phone
    ? await rateLimitQuery.eq('customer_phone', phone)
    : await rateLimitQuery.eq('customer_name', payload.customer_name.trim())
  if ((recentCount ?? 0) >= 3) {
    return { success: false, error: 'Too many requests. Please wait a minute and try again.' }
  }

  // 5. Verify vendor is active
  //    Using adminSupabase (service role) for the same reason as checkout.ts —
  //    anonymous customers have no SELECT policy on vendors, so INSERT … RETURNING
  //    would fail with RLS if we used the user-scoped client.
  const { data: vendorCheck } = await adminSupabase
    .from('vendors')
    .select('id, blocked_dates')
    .eq('id', payload.vendor_id)
    .eq('is_active', true)
    .maybeSingle()
  if (!vendorCheck) {
    return { success: false, error: 'This property is not accepting bookings right now.' }
  }

  // 6. Availability — re-checked server-side so a stale calendar, a direct
  //    API call, or two customers racing can't double-book. Mirrors the
  //    storefront rules: vendor-blocked dates + room-blocked dates + any
  //    non-cancelled booking of the same room (booked ranges block their
  //    checkout day too, matching the customer calendar).
  const DAY = 86_400_000
  const blocked = new Set([
    ...((vendorCheck.blocked_dates as string[] | null) ?? []),
    ...((service.blocked_dates as string[] | null) ?? []),
  ])
  const startMs = Date.parse(payload.start_date + 'T00:00:00Z')
  const endMs   = Date.parse(payload.end_date   + 'T00:00:00Z')
  for (let ms = startMs; ms < endMs; ms += DAY) {
    if (blocked.has(new Date(ms).toISOString().slice(0, 10))) {
      return { success: false, error: 'One or more of your dates is no longer available. Please pick different dates.' }
    }
  }

  const { count: overlapCount, error: overlapErr } = await adminSupabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', payload.vendor_id)
    .eq('service_name', serviceName)
    .neq('status', 'cancelled')
    .lt('start_date', payload.end_date)
    .gte('end_date', payload.start_date)
  if (overlapErr) {
    console.error('[createBooking] overlap check failed:', overlapErr.message)
    return { success: false, error: 'We could not check availability. Please try again.' }
  }
  if ((overlapCount ?? 0) > 0) {
    return { success: false, error: 'These dates were just booked by someone else. Please pick different dates.' }
  }

  const short_booking_id = makeShortBookingId()

  // ── Attempt 1: full insert with total_price ───────────────
  const { data, error } = await adminSupabase
    .from('bookings')
    .insert({
      vendor_id:       payload.vendor_id,
      short_booking_id,
      customer_name:   payload.customer_name.trim(),
      customer_phone:  payload.customer_phone.trim() || null,
      service_name:    serviceName,
      start_date:      payload.start_date,
      end_date:        payload.end_date,
      notes:           payload.notes.trim() || null,
      status:          'pending',
      payment_status:  'awaiting',
      total_price:     derivedTotal,
    })
    .select('booking_token, short_booking_id')
    .single()

  if (!error) {
    await notifyNewBooking(payload.vendor_id, {
      shortBookingId: data.short_booking_id as string,
      customerName:   payload.customer_name.trim(),
      customerPhone:  payload.customer_phone.trim() || null,
      serviceName:    serviceName,
      startDate:      payload.start_date,
      endDate:        payload.end_date,
      nights:         nights,
      total:          derivedTotal,
      notes:          payload.notes.trim() || null,
    })
    return {
      success:          true,
      booking_token:    data.booking_token as string,
      short_booking_id: data.short_booking_id as string,
      total_price:      derivedTotal,
    }
  }

  console.error('[createBooking] Full insert failed:', error.message)

  // ── Attempt 2: fallback without total_price ───────────────
  if (isMissingColumnError(error.message)) {
    const { data: fb, error: fbErr } = await adminSupabase
      .from('bookings')
      .insert({
        vendor_id:       payload.vendor_id,
        short_booking_id,
        customer_name:   payload.customer_name.trim(),
        customer_phone:  payload.customer_phone.trim() || null,
        service_name:    serviceName,
        start_date:      payload.start_date,
        end_date:        payload.end_date,
        notes:           payload.notes.trim() || null,
        status:          'pending',
        payment_status:  'awaiting',
      })
      .select('booking_token, short_booking_id')
      .single()

    if (!fbErr) {
      await notifyNewBooking(payload.vendor_id, {
        shortBookingId: fb.short_booking_id as string,
        customerName:   payload.customer_name.trim(),
        customerPhone:  payload.customer_phone.trim() || null,
        serviceName:    serviceName,
        startDate:      payload.start_date,
        endDate:        payload.end_date,
        nights:         nights,
        total:          derivedTotal,
        notes:          payload.notes.trim() || null,
      })
      return {
        success:          true,
        booking_token:    fb.booking_token as string,
        short_booking_id: fb.short_booking_id as string,
        total_price:      derivedTotal,
      }
    }
    console.error('[createBooking] Fallback insert failed:', fbErr.message)
  }

  return {
    success: false,
    error: 'We could not place your booking. Please try again or contact the host directly.',
  }
}
