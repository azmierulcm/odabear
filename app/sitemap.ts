import type { MetadataRoute } from 'next'
import { adminSupabase } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.odabear.com'

// Served at /sitemap.xml. Regenerated at most hourly, so newly published
// vendors show up for crawlers without a redeploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,        changeFrequency: 'weekly',  priority: 1 },
    { url: `${SITE_URL}/bazaar`,  changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/terms`,   changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly',  priority: 0.2 },
  ]

  // Service role: the sitemap must list every live store regardless of the
  // anon RLS view, and this runs server-side only.
  const { data: vendors, error } = await adminSupabase
    .from('vendors')
    .select('slug')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(5000)

  if (error) {
    console.error('[sitemap] vendor fetch failed:', error.message)
    return staticPages
  }

  const vendorPages: MetadataRoute.Sitemap = (vendors ?? []).map((v) => ({
    url: `${SITE_URL}/${v.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticPages, ...vendorPages]
}
