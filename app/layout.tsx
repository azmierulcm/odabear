import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Jomoda',
  description: 'Digital menus for F&B businesses',
}

// width=device-width + initialScale=1 stops Android Chrome from rendering
// at 980px and intercepting touch events. maximumScale is intentionally
// NOT set so users can pinch-zoom for accessibility.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
