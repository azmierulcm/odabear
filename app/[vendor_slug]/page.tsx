import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase/admin'
import { getStorefront } from '@/lib/storefront'
import MenuClient from './MenuClient'
import BookingClient from './BookingClient'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://odabear.com'

// Link-preview tags so a vendor's storefront looks rich when shared on
// WhatsApp (rule #4 — WhatsApp is the primary sharing channel), Telegram, etc.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendor_slug: string }>
}): Promise<Metadata> {
  const { vendor_slug } = await params
  const store = await getStorefront(vendor_slug)
  const vendor = store?.vendor

  if (!vendor) {
    return { title: 'Shop not found · Odabear' }
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
      siteName: 'Odabear',
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
  const store = await getStorefront(vendor_slug)

  if (!store) notFound()
  const { vendor, categories } = store

  if (!vendor.business_type) notFound()

  if (vendor.business_type === 'booking') {
    const todayStr = new Date().toISOString().split('T')[0]

    // Availability must be live, so bookings are fetched fresh (uncached) via
    // the service role — only the menu above comes from the Data Cache.
    const { data: bookingData } = await adminSupabase
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
