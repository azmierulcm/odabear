import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase PKCE auth callback.
 * Handles: email confirmation, OAuth, and password-reset redirects.
 *
 * Supabase redirects here with ?code=<CODE>&next=<PATH>.
 * We exchange the code for a session, then forward to `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/welcome'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    // Exchange failed — send to login with error hint
    return NextResponse.redirect(`${origin}/login?error=link_expired`)
  }

  // No code — just redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
