import { Resend } from 'resend'
import { adminSupabase } from '@/lib/supabase/admin'
import { escapeHtml, wrapEmail } from './shell'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://odabear.com'
// Replies go to the owner's inbox; the from-domain just needs Resend verification.
const REPLY_TO = 'holaodabear@gmail.com'
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
      from: 'Odabear <hello@odabear.com>',
      replyTo: REPLY_TO,
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
      from: 'Odabear <hello@odabear.com>',
      replyTo: REPLY_TO,
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
      from: 'Odabear <hello@odabear.com>',
      replyTo: REPLY_TO,
      to: contact.email,
      subject: `📋 Receipt uploaded — ${label} #${info.ref}`,
      html,
    })
    if (error) console.error('[notifyReceiptUploaded] Resend error:', error)
  } catch (err) {
    console.error('[notifyReceiptUploaded] failed:', err)
  }
}

// ─── Subscription lifecycle ────────────────────────────────────
// Both are sent by the daily expire-trials cron. The dashboard has self-serve
// renewal (SubscriptionCard), so the CTA goes straight there.

export async function notifyAccessExpired(info: {
  email: string
  vendorName: string
  wasTrial: boolean
}): Promise<void> {
  try {
    const what = info.wasTrial ? 'free trial' : 'subscription'
    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">Hi ${escapeHtml(info.vendorName)},</p>
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">
        Your ${what} for <strong>${escapeHtml(info.vendorName)}</strong> on Odabear has ended.
        Your store is now hidden and customers can no longer place orders.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #FF385C;border-radius:12px;margin:24px 0 8px;">
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#717171;text-transform:uppercase;letter-spacing:0.5px;">Monthly plan</p>
          <p style="margin:8px 0 4px;font-size:40px;font-weight:900;color:#222222;line-height:1;">
            <span style="font-size:20px;font-weight:700;color:#717171;vertical-align:super;">RM</span>150
            <span style="font-size:16px;font-weight:600;color:#717171;">/mo</span>
          </p>
          <p style="margin:0;font-size:13px;color:#717171;">0% commission · No contracts · Cancel anytime</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:14px;color:#717171;text-align:center;line-height:1.6;">
        Renew in under a minute — scan, pay, and your store goes live again instantly.<br/>
        Your store data is safe. Nothing is deleted.
      </p>
    `
    const html = wrapEmail({
      headerEmoji: '⏰',
      headerGradient: 'linear-gradient(135deg,#E31C5F,#FF385C)',
      headerTitle: info.wasTrial ? 'Your free trial has ended' : 'Your subscription has ended',
      headerSubtitle: 'Your store is currently hidden',
      bodyHtml,
      ctaLabel: 'Renew & go live →',
      ctaUrl: DASHBOARD_URL,
    })
    const { error } = await resend.emails.send({
      from: 'Odabear <hello@odabear.com>',
      replyTo: REPLY_TO,
      to: info.email,
      subject: `Your Odabear ${info.wasTrial ? 'trial' : 'subscription'} has ended — keep ${info.vendorName} live`,
      html,
    })
    if (error) console.error('[notifyAccessExpired] Resend error:', error)
  } catch (err) {
    console.error('[notifyAccessExpired] failed:', err)
  }
}

export async function notifyRenewalReminder(info: {
  email: string
  vendorName: string
  daysLeft: number
  isTrial: boolean
}): Promise<void> {
  try {
    const what = info.isTrial ? 'free trial' : 'subscription'
    const dayWord = `${info.daysLeft} day${info.daysLeft !== 1 ? 's' : ''}`
    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">Hi ${escapeHtml(info.vendorName)},</p>
      <p style="margin:0 0 16px;font-size:16px;color:#222222;line-height:1.6;">
        Your ${what} for <strong>${escapeHtml(info.vendorName)}</strong> ends in <strong>${dayWord}</strong>.
        Renew now so your store stays live and customers can keep ordering without interruption.
      </p>
      <p style="margin:0;font-size:14px;color:#717171;line-height:1.6;">
        Renewing takes under a minute: open your dashboard, scan the payment QR (RM150),
        upload your receipt — done.
      </p>
    `
    const html = wrapEmail({
      headerEmoji: '⏳',
      headerGradient: 'linear-gradient(135deg,#D97706,#F59E0B)',
      headerTitle: `${dayWord} left on your ${what}`,
      headerSubtitle: 'Renew now to stay live',
      bodyHtml,
      ctaLabel: 'Renew now →',
      ctaUrl: DASHBOARD_URL,
    })
    const { error } = await resend.emails.send({
      from: 'Odabear <hello@odabear.com>',
      replyTo: REPLY_TO,
      to: info.email,
      subject: `⏳ ${info.vendorName}: ${dayWord} left on your Odabear ${what}`,
      html,
    })
    if (error) console.error('[notifyRenewalReminder] Resend error:', error)
  } catch (err) {
    console.error('[notifyRenewalReminder] failed:', err)
  }
}
