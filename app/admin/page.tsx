import { adminSupabase } from '@/lib/supabase/admin'
import { getPlatformBilling } from '@/lib/platform'
import AdminClient from './AdminClient'
import AdminBilling from './AdminBilling'
import { listSubscriptionPayments } from './actions'

export type VendorStat = {
  id: string
  vendor_number: number | null
  name: string
  slug: string
  phone_number: string
  logo_url: string | null
  is_active: boolean
  user_id: string | null
  created_at: string
  trial_ends_at: string | null
  subscription_status: 'trial' | 'active' | 'expired' | null
  item_count: number
}

export default async function AdminPage() {
  const { data, error } = await adminSupabase
    .from('vendor_stats')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 rounded-xl p-4 text-sm">
        Failed to load vendors: {error.message}
      </div>
    )
  }

  const billing  = await getPlatformBilling()
  // Degrade gracefully if the subscriptions migration hasn't been run yet.
  const payments = await listSubscriptionPayments().catch(() => [])
  const fromEnv  = !!process.env.ODABEAR_DUITNOW_PAYLOAD?.trim()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Vendor Management</h1>
        <p className="text-sm text-gray-500 mt-1">{data?.length ?? 0} registered vendors</p>
      </div>
      <AdminClient vendors={(data ?? []) as VendorStat[]} />
      <AdminBilling initialBilling={{ ...billing, fromEnv }} initialPayments={payments} />
    </div>
  )
}
