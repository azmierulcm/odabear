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

    // Fetch non-cancelled bookings so the customer calendar can show
    // already-booked dates as unavailable (same view as vendor calendar).
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('start_date, end_date')
      .eq('vendor_id', vendor.id)
      .neq('status', 'cancelled')
      .gte('end_date', todayStr)

    // Expand each booking's date range into individual YYYY-MM-DD strings.
    const DAY = 86400000
    const bookedDates: string[] = []
    for (const b of bookingData ?? []) {
      const startMs = new Date(b.start_date + 'T00:00:00Z').getTime()
      const endMs   = new Date(b.end_date   + 'T00:00:00Z').getTime()
      for (let ms = startMs; ms <= endMs; ms += DAY) {
        bookedDates.push(new Date(ms).toISOString().split('T')[0])
      }
    }

    return <BookingClient vendor={vendor as Vendor} categories={categories} bookedDates={bookedDates} />
  }

  return <MenuClient vendor={vendor as Vendor} categories={categories} />
}
