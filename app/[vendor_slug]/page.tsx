import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Vendor, CategoryWithItems, Item } from '@/types/menu'
import MenuClient from './MenuClient'
import BookingClient from './BookingClient'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jomoda.vercel.app'

// Cached for the duration of a single request so generateMetadata and the page
// component share one DB read of the vendor instead of querying it twice.
const getVendor = cache(async (slug: string): Promise<Vendor | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vendors')
    .select('*')
    .eq('slug', slug)
    .single()
  return (data as Vendor) ?? null
})

// Link-preview tags so a vendor's storefront looks rich when shared on
// WhatsApp (rule #4 — WhatsApp is the primary sharing channel), Telegram, etc.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendor_slug: string }>
}): Promise<Metadata> {
  const { vendor_slug } = await params
  const vendor = await getVendor(vendor_slug)

  if (!vendor) {
    return { title: 'Shop not found · Jomoda' }
  }

  const typeLabel =
    vendor.business_type === 'booking' ? 'Book Now'
    : vendor.business_type === 'retail' ? 'Shop'
    : 'Menu'

  const fallbackDesc =
    vendor.business_type === 'booking'
      ? `Check availability and book ${vendor.name} directly on WhatsApp — no app needed.`
      : vendor.business_type === 'retail'
      ? `Shop ${vendor.name} and order directly on WhatsApp — no app needed.`
      : `Browse ${vendor.name}'s menu and order directly on WhatsApp — no app needed.`

  const description = vendor.description?.trim() || fallbackDesc
  const title = `${vendor.name} · ${typeLabel}`
  const url = `${SITE_URL}/${vendor.slug}`

  // Prefer a landscape hero photo for a large WhatsApp preview; fall back to
  // the logo, then to nothing (the preview still shows title + description).
  const ogImage = vendor.gallery_urls?.[0] || vendor.logo_url || undefined
  const images = ogImage ? [{ url: ogImage, alt: vendor.name }] : undefined

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: 'Jomoda',
      ...(images ? { images } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(images ? { images: [ogImage!] } : {}),
    },
  }
}

export default async function VendorMenuPage({
  params,
}: {
  params: Promise<{ vendor_slug: string }>
}) {
  const { vendor_slug } = await params
  const vendor = await getVendor(vendor_slug)

  if (!vendor) notFound()

  const supabase = await createClient()
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
      vendor={vendor}
      categories={categories}
      bookings={bookingData ?? []}
    />
  }

  return <MenuClient vendor={vendor} categories={categories} />
}
