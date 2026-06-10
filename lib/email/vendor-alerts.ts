import { Resend } from 'resend'
import { adminSupabase } from '@/lib/supabase/admin'
import { escapeHtml, wrapEmail } from './shell'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jomoda.my'
const DASHBOARD_URL = `${SITE_URL}/dashboard`

interface VendorContact {
  email: string
  name: string
}

async function getVendorContact(vendorId: string): Promise<VendorContact | null> {
  const { data: vendor } = await adminSupabase
    .from('vendors')
    .select('name, user_id')
    .eq('id', vendorId)
    .maybeSingle()
  if (!vendor?.user_id) return null

  const { data, error } = await adminSupabase.auth.admin.getUserById(vendor.user_id)
  if (error || !data.user?.email) return null

  return { email: data.user.email, name: vendor.name }
}

interface OrderItemInfo {
  name: string
  price: number
  quantity: number
}

// ─── New order ──────────────────────────────────────────────────

export async function notifyNewOrder(vendorId: string, info: {
  shortOrderId: string
  customerName: string
  customerPhone: string | null
  total: number
  items: OrderItemInfo[]
  deliveryType: 'pickup' | 'delivery'
  deliveryAddress: string | null
  notes: string | null
}): Promise<void> {
  try {
    const contact = await getVendorContact(vendorId)
    if (!contact) return

    const itemRows = info.items.map((it) => `
      <tr>
        <td style="font-size:14px;color:#222222;padding:4px 0;">${it.quantity}x ${escapeHtml(it.name)}</td>
        <td align="right" style="font-size:14px;color:#222222;padding:4px 0;white-space:nowrap;">RM ${(it.price * it.quantity).toFixed(2)}</td>
      </tr>`).join('')

    const deliveryLine = info.deliveryType === 'delivery'
      ? `🚚 Delivery to: ${escapeHtml(info.deliveryAddress ?? '—')}`
      : '🏪 Self pickup'

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">Hi ${escapeHtml(contact.name)},</p>
      <p style="margin:0 0 20px;font-size:16px;color:#222222;line-height:1.6;">
        You've got a new order from <strong>${escapeHtml(info.customerName)}</strong>${info.customerPhone ? ` (${escapeHtml(info.customerPhone)})` : ''}.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;border-radius:12px;margin-bottom:20px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#717171;text-transform:uppercase;letter-spacing:0.5px;">
            Order #${escapeHtml(info.shortOrderId)}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemRows}
            <tr><td colspan="2" style="padding-top:8px;border-top:1px solid #DDDDDD;"></td></tr>
            <tr>
              <td style="font-size:16px;font-weight:800;color:#222222;padding-top:8px;">Total</td>
              <td align="right" style="font-size:16px;font-weight:800;color:#222222;padding-top:8px;">RM ${info.total.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:0;font-size:14px;color:#717171;line-height:1.6;">
        ${deliveryLine}${info.notes ? `<br/>📝 ${escapeHtml(info.notes)}` : ''}
      </p>
    `

    const html = wrapEmail({
      headerEmoji: '🛍️',
      headerGradient: 'linear-gradient(135deg,#16A34A,#22C55E)',
      headerTitle: 'New order received!',
      headerSubtitle: `RM ${info.total.toFixed(2)} from ${info.customerName}`,
      bodyHtml,
      ctaLabel: 'Open Dashboard →',
      ctaUrl: DASHBOARD_URL,
    })

    const { error } = await resend.emails.send({
      from: 'Jomoda <hello@jomoda.my>',
      to: contact.email,
      subject: `🔔 New order #${info.shortOrderId} — RM ${info.total.toFixed(2)}`,
      html,
    })
    if (error) console.error('[notifyNewOrder] Resend error:', error)
  } catch (err) {
    console.error('[notifyNewOrder] failed:', err)
  }
}

// ─── New booking ────────────────────────────────────────────────

export async function notifyNewBooking(vendorId: string, info: {
  shortBookingId: string
  customerName: string
  customerPhone: string | null
  serviceName: string
  startDate: string
  endDate: string
  nights: number
  total: number
  notes: string | null
}): Promise<void> {
  try {
    const contact = await getVendorContact(vendorId)
    if (!contact) return

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">Hi ${escapeHtml(contact.name)},</p>
      <p style="margin:0 0 20px;font-size:16px;color:#222222;line-height:1.6;">
        You've got a new booking request from <strong>${escapeHtml(info.customerName)}</strong>${info.customerPhone ? ` (${escapeHtml(info.customerPhone)})` : ''}.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;border-radius:12px;margin-bottom:20px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#717171;text-transform:uppercase;letter-spacing:0.5px;">
            Booking #${escapeHtml(info.shortBookingId)}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:14px;color:#717171;padding:3px 0;">Service</td>
              <td align="right" style="font-size:14px;color:#222222;font-weight:600;padding:3px 0;">${escapeHtml(info.serviceName)}</td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#717171;padding:3px 0;">Check-in</td>
              <td align="right" style="font-size:14px;color:#222222;padding:3px 0;">${info.startDate}</td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#717171;padding:3px 0;">Check-out</td>
              <td align="right" style="font-size:14px;color:#222222;padding:3px 0;">${info.endDate}</td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#717171;padding:3px 0;">Duration</td>
              <td align="right" style="font-size:14px;color:#222222;padding:3px 0;">${info.nights} night${info.nights !== 1 ? 's' : ''}</td>
            </tr>
            <tr><td colspan="2" style="padding-top:8px;border-top:1px solid #DDDDDD;"></td></tr>
            <tr>
              <td style="font-size:16px;font-weight:800;color:#222222;padding-top:8px;">Total</td>
              <td align="right" style="font-size:16px;font-weight:800;color:#222222;padding-top:8px;">RM ${info.total.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
      </table>
      ${info.notes ? `<p style="margin:0;font-size:14px;color:#717171;line-height:1.6;">📝 ${escapeHtml(info.notes)}</p>` : ''}
    `

    const html = wrapEmail({
      headerEmoji: '🏡',
      headerGradient: 'linear-gradient(135deg,#16A34A,#22C55E)',
      headerTitle: 'New booking request!',
      headerSubtitle: `RM ${info.total.toFixed(2)} from ${info.customerName}`,
      bodyHtml,
      ctaLabel: 'Open Dashboard →',
      ctaUrl: DASHBOARD_URL,
    })

    const { error } = await resend.emails.send({
      from: 'Jomoda <hello@jomoda.my>',
      to: contact.email,
      subject: `🔔 New booking #${info.shortBookingId} — RM ${info.total.toFixed(2)}`,
      html,
    })
    if (error) console.error('[notifyNewBooking] Resend error:', error)
  } catch (err) {
    console.error('[notifyNewBooking] failed:', err)
  }
}

// ─── Payment receipt uploaded ──────────────────────────────────

export async function notifyReceiptUploaded(vendorId: string, info: {
  type: 'order' | 'booking'
  ref: string
  customerName: string
  total: number
}): Promise<void> {
  try {
    const contact = await getVendorContact(vendorId)
    if (!contact) return

    const label = info.type === 'order' ? 'Order' : 'Booking'

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">Hi ${escapeHtml(contact.name)},</p>
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">
        <strong>${escapeHtml(info.customerName)}</strong> uploaded a payment receipt for ${label} <strong>#${escapeHtml(info.ref)}</strong> (RM ${info.total.toFixed(2)}).
      </p>
      <p style="margin:0;font-size:14px;color:#717171;line-height:1.6;">
        Please check your bank app, then confirm or reject the payment in your dashboard.
      </p>
    `

    const html = wrapEmail({
      headerEmoji: '📋',
      headerGradient: 'linear-gradient(135deg,#2563EB,#3B82F6)',
      headerTitle: 'Payment receipt uploaded',
      headerSubtitle: 'Action needed — please confirm',
      bodyHtml,
      ctaLabel: 'Review in Dashboard →',
      ctaUrl: DASHBOARD_URL,
    })

    const { error } = await resend.emails.send({
      from: 'Jomoda <hello@jomoda.my>',
      to: contact.email,
      subject: `📋 Receipt uploaded — ${label} #${info.ref}`,
      html,
    })
    if (error) console.error('[notifyReceiptUploaded] Resend error:', error)
  } catch (err) {
    console.error('[notifyReceiptUploaded] failed:', err)
  }
}
