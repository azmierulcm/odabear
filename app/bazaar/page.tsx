import type { Metadata } from 'next'
import { adminSupabase } from '@/lib/supabase/admin'
import BazaarClient from './BazaarClient'
import type { BazaarVendor } from './StallCard'

// ISR — page is statically served and silently revalidated every hour.
// New shops added to the DB will appear within 60 minutes without any deploy.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'The Bazaar — Browse Local Shops | Odabear',
  description: 'Discover local restaurants, retail shops, and homestays. Shop direct via WhatsApp with no commissions.',
}

export default async function BazaarPage() {
  const { data, error } = await adminSupabase
    .from('vendors')
    .select('id, name, slug, business_type, logo_url, description, is_featured, gallery_urls')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('name',        { ascending: true  })

  if (error) {
    console.error('[BazaarPage] fetch error:', error.message)
  }

  const vendors = (data ?? []) as BazaarVendor[]

  return <BazaarClient vendors={vendors} />
}
