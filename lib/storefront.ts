import { unstable_cache } from 'next/cache'
import { adminSupabase } from '@/lib/supabase/admin'
import type { Vendor, CategoryWithItems, Item } from '@/types/menu'

export interface StorefrontData {
  vendor: Vendor
  categories: CategoryWithItems[]
}

// Public storefront menu (vendor + categories + items), read via the service
// role (no per-user cookies) and held in the Data Cache across requests — so a
// popular store stops hitting Postgres on every single visit.
//
// Only the menu is cached. Availability/bookings are fetched fresh by the page,
// since those must reflect new bookings immediately. The 60s revalidate means a
// vendor's menu edit goes live within a minute (far fresher than /bazaar's 1h).
export function getStorefront(slug: string): Promise<StorefrontData | null> {
  return unstable_cache(
    async (): Promise<StorefrontData | null> => {
      const { data: vendor } = await adminSupabase
        .from('vendors')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (!vendor) return null

      const { data: rawCategories } = await adminSupabase
        .from('categories')
        .select('*, items(*)')
        .eq('vendor_id', (vendor as Vendor).id)
        .order('sort_order', { ascending: true })

      const categories: CategoryWithItems[] = (rawCategories ?? []).map((cat) => ({
        id:         cat.id,
        vendor_id:  cat.vendor_id,
        name:       cat.name,
        sort_order: cat.sort_order,
        items: ((cat.items ?? []) as Item[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))

      return { vendor: vendor as Vendor, categories }
    },
    ['storefront', slug],
    { tags: [`vendor:${slug}`], revalidate: 60 },
  )()
}
