import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch vendor slug for the "View listing" link
  const { data: vendor } = await supabase
    .from('vendors')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-surface">
      {/* Top nav */}
      <header className="fixed top-0 inset-x-0 z-20 bg-white border-b border-border h-16 flex items-center px-6">
        <a href="/" className="text-lg font-bold text-brand shrink-0">jomoda</a>

        <div className="flex-1 flex justify-center">
          <p className="text-sm text-fog hidden sm:block truncate max-w-xs">{user.email}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {vendor?.slug && (
            <a
              href={`/${vendor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-ink underline hidden sm:block"
            >
              View listing ↗
            </a>
          )}
          <LogoutButton />
        </div>
      </header>

      <main className="pt-16">{children}</main>
    </div>
  )
}
