import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlatformBilling } from '@/lib/platform'
import type { Vendor, Category, Item } from '@/types/menu'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch vendor for this user
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const billing = await getPlatformBilling()

  let categories: Category[] = []
  let items: Item[] = []

  if (vendor) {
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('sort_order', { ascending: true })

    categories = (cats ?? []) as Category[]

    if (categories.length > 0) {
      const { data: its } = await supabase
        .from('items')
        .select('*')
        .in(
          'category_id',
          categories.map((c) => c.id)
        )
        .order('sort_order', { ascending: true })

      items = (its ?? []) as Item[]
    }
  }

  return (
    <DashboardClient
      userId={user.id}
      vendor={vendor as Vendor | null}
      initialCategories={categories}
      initialItems={items}
      billing={billing}
    />
  )
}
