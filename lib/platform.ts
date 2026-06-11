import { adminSupabase } from '@/lib/supabase/admin'

export interface PlatformBilling {
  payload: string | null   // DuitNow EMVCo payload → enables amount-prefilled QR
  name: string             // recipient name shown to vendors
  qrUrl: string | null     // original QR image (fallback if payload absent)
}

// Resolves Jomoda's own DuitNow billing details. Env vars win (so the payload
// can be kept out of the DB if preferred); otherwise we read the singleton
// platform_settings row that the admin populates by uploading the QR.
export async function getPlatformBilling(): Promise<PlatformBilling> {
  const envPayload = process.env.JOMODA_DUITNOW_PAYLOAD?.trim()
  if (envPayload) {
    return {
      payload: envPayload,
      name:    process.env.JOMODA_DUITNOW_NAME?.trim() || 'Jomoda',
      qrUrl:   null,
    }
  }

  const { data } = await adminSupabase
    .from('platform_settings')
    .select('duitnow_payload, duitnow_name, qr_url')
    .eq('id', 1)
    .maybeSingle()

  return {
    payload: data?.duitnow_payload ?? null,
    name:    data?.duitnow_name ?? 'Jomoda',
    qrUrl:   data?.qr_url ?? null,
  }
}
