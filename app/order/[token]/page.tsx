import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { adminSupabase } from '@/lib/supabase/admin'
import { toDynamicPayload } from '@/lib/duitnowQr'
import { waUrl } from '@/lib/whatsapp'
import type { Order, Vendor, OrderLineItem, PaymentMethod } from '@/types/menu'
import OrderStatusClient from './OrderStatusClient'

// Always render fresh — payment status changes after the customer pays.
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function OrderStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!UUID_RE.test(token)) notFound()

  const { data: order } = await adminSupabase
    .from('orders').select('*').eq('order_token', token).maybeSingle()
  if (!order) notFound()

  const { data: vendor } = await adminSupabase
    .from('vendors').select('*').eq('id', (order as Order).vendor_id).maybeSingle()
  if (!vendor) notFound()

  const o = order as Order
  const v = vendor as Vendor
  const total = Number(o.total_price)
  const items: OrderLineItem[] = (o.items?.length ? o.items : o.cart_items) ?? []

  // Pre-render a dynamic, amount-filled QR for any method carrying a DuitNow payload.
  const payments = await Promise.all(
    (v.payment_methods ?? []).map(async (method: PaymentMethod) => {
      let dynamicQr: string | undefined
      if (method.duitnow_payload) {
        try {
          const payload = toDynamicPayload(method.duitnow_payload, { amount: total, reference: o.short_order_id })
          dynamicQr = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', width: 480, margin: 1 })
        } catch {
          dynamicQr = undefined
        }
      }
      return { method, dynamicQr }
    }),
  )

  const ref   = o.short_order_id
  const amount = total.toFixed(2)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://odabear.com'
  const orderUrl = `${siteUrl}/order/${token}`

  // Rich "I've paid" message the customer sends to the vendor via WhatsApp.
  const itemLines = items
    .map((it) => `• ${it.quantity}x ${it.name} — RM ${(it.price * it.quantity).toFixed(2)}`)
    .join('\n')
  const deliveryLine = o.delivery_type === 'delivery'
    ? `Mode: Delivery\nAddress: ${o.delivery_address ?? '—'}`
    : 'Mode: Self pickup'
  const notifyMsg = [
    `🚨 New Order #${ref}`,
    '─────────────────────',
    `Name: ${o.customer_name}`,
    o.customer_phone ? `Phone: ${o.customer_phone}` : null,
    deliveryLine,
    '',
    'Items:',
    itemLines,
    '',
    `Total Paid: RM ${amount}`,
    '',
    `🧾 Order & receipt proof:`,
    orderUrl,
    '─────────────────────',
    'Please verify the payment in your bank app, then confirm in your dashboard.',
  ].filter((l) => l !== null).join('\n')

  return (
    <OrderStatusClient
      token={token}
      shortOrderId={ref}
      customerFirstName={o.customer_name.split(' ')[0]}
      vendorName={v.name}
      vendorLogo={v.logo_url}
      total={total}
      items={items}
      initialPaymentStatus={o.payment_status}
      payments={payments}
      waUrl={waUrl(v.phone_number, `Hello! About my order ${ref} (RM ${amount}).`)}
      notifyPaidUrl={waUrl(v.phone_number, notifyMsg)}
    />
  )
}
