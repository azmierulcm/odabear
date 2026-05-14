import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

/**
 * GET /api/expire-trials?secret=CRON_SECRET
 *
 * Called daily by a cron job (pg_cron / cron-job.org / Vercel Cron).
 * Finds vendors whose trial has expired, unpublishes them, and sends
 * a trial-ended email to the account owner.
 */
export async function GET(req: Request) {
  // ── Auth — secret in Authorization header, not query param ──
  const auth = req.headers.get('authorization')
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Find expired trials ───────────────────────────────────
  const { data: expired, error: fetchError } = await adminSupabase
    .from('vendors')
    .select('id, name, slug, user_id')
    .eq('subscription_status', 'trial')
    .lt('trial_ends_at', new Date().toISOString())

  if (fetchError) {
    console.error('[expire-trials] fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ expired: 0 })
  }

  const ids = expired.map((v) => v.id)

  // ── Unpublish them ────────────────────────────────────────
  const { error: updateError } = await adminSupabase
    .from('vendors')
    .update({ is_active: false, subscription_status: 'expired' })
    .in('id', ids)

  if (updateError) {
    console.error('[expire-trials] update error:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    expired: expired.length,
    vendors: expired.map((v) => v.slug),
  })
}
