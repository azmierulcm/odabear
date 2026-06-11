import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.odabear.com'

const SITE_TITLE = 'Odabear — Sell on WhatsApp with your own mobile storefront'
const SITE_DESC =
  'Menus, orders and bookings for Malaysian businesses — straight to your WhatsApp. ' +
  'Your own storefront link, 0% commission, RM150/month.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  openGraph: {
    type: 'website',
    siteName: 'Odabear',
    title: SITE_TITLE,
    description: SITE_DESC,
    url: SITE_URL,
  },
}

// width=device-width + initialScale=1 stops Android Chrome from rendering
// at 980px and intercepting touch events. maximumScale is intentionally
// NOT set so users can pinch-zoom for accessibility.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Supabase storage origin — preconnecting shaves the DNS + TLS handshake off
// the first image fetch (vendor logos, hero galleries) on the storefront LCP.
const SUPABASE_ORIGIN = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin } catch { return null }
})()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        {SUPABASE_ORIGIN && (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        )}
      </head>
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
