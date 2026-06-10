import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { adminSupabase } from '@/lib/supabase/admin'
import { toDynamicPayload } from '@/lib/duitnowQr'
import { waUrl } from '@/lib/whatsapp'
import type { Booking, Vendor, PaymentMethod, Item } from '@/types/menu'
import BookingStatusClient from './BookingStatusClient'

// Always render fresh — payment status changes after the customer pays.
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!UUID_RE.test(token)) notFound()

  const { data: booking } = await adminSupabase
    .from('bookings')
    .select('*')
    .eq('booking_token', token)
    .maybeSingle()
  if (!booking) notFound()

  const { data: vendor } = await adminSupabase
    .from('vendors')
    .select('*')
    .eq('id', (booking as Booking).vendor_id)
    .maybeSingle()
  if (!vendor) notFound()

  const b = booking as Booking
  const v = vendor as Vendor

  // Compute nights
  const nights = Math.max(
    1,
    Math.round(
      (new Date(b.end_date + 'T00:00:00Z').getTime() -
        new Date(b.start_date + 'T00:00:00Z').getTime()) /
        86400000,
    ),
  )

  // Resolve total_price: use stored value if present, otherwise derive from item price x nights.
  const storedTotal = (b as Booking & { total_price?: number }).total_price
  let total = storedTotal ? Number(storedTotal) : 0

  if (!total) {
    // Look up the service item to get its price
    const { data: cats } = await adminSupabase
      .from('categories')
      .select('id')
      .eq('vendor_id', v.id)
    const catIds = (cats ?? []).map((c: { id: string }) => c.id)

    if (catIds.length > 0) {
      const { data: items } = await adminSupabase
        .from('items')
        .select('name, price')
        .in('category_id', catIds)
      const serviceItem = ((items ?? []) as Pick<Item, 'name' | 'price'>[]).find(
        (i) => i.name === b.service_name,
      )
      if (serviceItem) total = serviceItem.price * nights
    }
  }

  // Pre-render a dynamic, amount-filled QR for any DuitNow payment method.
  const payments = await Promise.all(
    (v.payment_methods ?? []).map(async (method: PaymentMethod) => {
      let dynamicQr: string | undefined
      if (method.duitnow_payload && total > 0) {
        try {
          const payload = toDynamicPayload(method.duitnow_payload, {
            amount:    total,
            reference: b.short_booking_id ?? '',
          })
          dynamicQr = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: 'M',
            width:  480,
            margin: 1,
          })
        } catch {
          dynamicQr = undefined
        }
      }
      return { method, dynamicQr }
    }),
  )

  const ref    = b.short_booking_id ?? token.slice(0, 8).toUpperCase()
  const amount = total.toFixed(2)
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jomoda.vercel.app'
  const bookingUrl = `${siteUrl}/booking/${token}`

  // Rich "I have paid" message the customer sends to the vendor via WhatsApp.
  const notifyMsg = [
    `🚨 New Booking #${ref}`,
    '─────────────────────',
    `Name: ${b.customer_name}`,
    b.customer_phone ? `Phone: ${b.customer_phone}` : null,
    '',
    `Service: ${b.service_name}`,
    `Check-in:  ${b.start_date}`,
    `Check-out: ${b.end_date}`,
    `Duration:  ${nights} night${nights !== 1 ? 's' : ''}`,
    '',
    `Total Paid: RM ${amount}`,
    '',
    `🧾 Booking & receipt proof:`,
    bookingUrl,
    '─────────────────────',
    'Please verify the payment in your bank app, then confirm in your dashboard.',
  ]
    .filter((l) => l !== null)
    .join('\n')

  return (
    <BookingStatusClient
      token={token}
      shortBookingId={ref}
      customerFirstName={b.customer_name.split(' ')[0]}
      vendorName={v.name}
      vendorLogo={v.logo_url}
      serviceName={b.service_name}
      checkIn={b.start_date}
      checkOut={b.end_date}
      nights={nights}
      total={total}
      initialPaymentStatus={b.payment_status ?? 'awaiting'}
      payments={payments}
      waUrl={waUrl(v.phone_number, `Hello! About my booking ${ref} (RM ${amount}).`)}
      notifyPaidUrl={waUrl(v.phone_number, notifyMsg)}
    />
  )
}
