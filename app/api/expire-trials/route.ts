import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { notifyAccessExpired, notifyRenewalReminder } from '@/lib/email/vendor-alerts'

const REMINDER_DAYS = 3

async function getOwnerEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const { data, error } = await adminSupabase.auth.admin.getUserById(userId)
  if (error) return null
  return data.user?.email ?? null
}

/**
 * GET /api/expire-trials  (Authorization: Bearer CRON_SECRET)
 *
 * Called daily by a cron job. Two passes:
 *  1. Expire — vendors (trial or paid) past their date are unpublished,
 *     flipped to 'expired', and emailed a renew link.
 *  2. Remind — vendors with exactly REMINDER_DAYS days left get a heads-up.
 *     The one-day window means a daily cron emails each vendor only once.
 */
export async function GET(req: Request) {
  // ── Auth — secret in Authorization header, not query param ──
  const auth = req.headers.get('authorization')
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // ── Pass 1: lapsed access (free trials AND paid subs past their date) ──
  const { data: expired, error: fetchError } = await adminSupabase
    .from('vendors')
    .select('id, name, slug, user_id, subscription_status')
    .in('subscription_status', ['trial', 'active'])
    .lt('trial_ends_at', now.toISOString())

  if (fetchError) {
    console.error('[expire-trials] fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (expired && expired.length > 0) {
    const ids = expired.map((v) => v.id)
    const { error: updateError } = await adminSupabase
      .from('vendors')
      .update({ is_active: false, subscription_status: 'expired' })
      .in('id', ids)

    if (updateError) {
      console.error('[expire-trials] update error:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Email each owner (best-effort — a bounced email must not fail the cron).
    for (const v of expired) {
      const email = await getOwnerEmail(v.user_id)
      if (!email) continue
      await notifyAccessExpired({
        email,
        vendorName: v.name,
        wasTrial: v.subscription_status === 'trial',
      })
    }
  }

  // ── Pass 2: renewal reminders — REMINDER_DAYS days before expiry ──
  // Window of [REMINDER_DAYS - 1, REMINDER_DAYS] days out: a daily run
  // catches each vendor exactly once.
  const windowStart = new Date(now.getTime() + (REMINDER_DAYS - 1) * 86_400_000)
  const windowEnd   = new Date(now.getTime() + REMINDER_DAYS * 86_400_000)

  const { data: expiringSoon, error: soonError } = await adminSupabase
    .from('vendors')
    .select('id, name, user_id, subscription_status')
    .in('subscription_status', ['trial', 'active'])
    .gte('trial_ends_at', windowStart.toISOString())
    .lt('trial_ends_at', windowEnd.toISOString())

  if (soonError) {
    console.error('[expire-trials] reminder fetch error:', soonError.message)
  } else if (expiringSoon) {
    for (const v of expiringSoon) {
      const email = await getOwnerEmail(v.user_id)
      if (!email) continue
      await notifyRenewalReminder({
        email,
        vendorName: v.name,
        daysLeft: REMINDER_DAYS,
        isTrial: v.subscription_status === 'trial',
      })
    }
  }

  return NextResponse.json({
    expired: expired?.length ?? 0,
    reminded: expiringSoon?.length ?? 0,
    vendors: (expired ?? []).map((v) => v.slug),
  })
}
