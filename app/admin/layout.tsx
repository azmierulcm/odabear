import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminLogout from './AdminLogout'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">odabear</span>
          <span className="text-xs font-semibold border border-white/40 text-white px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
        <AdminLogout />
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
