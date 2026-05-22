import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Vendor, CategoryWithItems, Item } from '@/types/menu'
import MenuClient from './MenuClient'
import BookingClient from './BookingClient'

export default async function VendorMenuPage({
  params,
}: {
  params: Promise<{ vendor_slug: string }>
}) {
  const { vendor_slug } = await params
  const supabase = await createClient()

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .eq('slug', vendor_slug)
    .single()

  if (vendorError || !vendor) notFound()

  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*, items(*)')
    .eq('vendor_id', vendor.id)
    .order('sort_order', { ascending: true })

  const categories: CategoryWithItems[] = (rawCategories ?? []).map((cat) => ({
    id: cat.id,
    vendor_id: cat.vendor_id,
    name: cat.name,
    sort_order: cat.sort_order,
    items: ((cat.items ?? []) as Item[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }))

  if (!vendor.business_type) notFound()

  if (vendor.business_type === 'booking') {
    const todayStr = new Date().toISOString().split('T')[0]

    // Fetch non-cancelled bookings WITH service_name so the client can
    // filter availability per room — Room A booked ≠ Room B blocked.
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('start_date, end_date, service_name')
      .eq('vendor_id', vendor.id)
      .neq('status', 'cancelled')
      .gte('end_date', todayStr)

    return <BookingClient
      vendor={vendor as Vendor}
      categories={categories}
      bookings={bookingData ?? []}
    />
  }

  return <MenuClient vendor={vendor as Vendor} categories={categories} />
}
