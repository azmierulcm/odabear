// Shared subscription constants + pure date helpers (safe on client & server).

export const SUBSCRIPTION_PRICE = 150      // RM per month
export const SUBSCRIPTION_DAYS  = 30       // days granted per payment

export type SubStatus = 'trial' | 'active' | 'expired' | null

// Whole days from now until `iso` (negative if already past). Null-safe.
export function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

// New access-end date when a payment lands: extend from whichever is later —
// the current expiry (early renewal stacks) or now (lapsed account restarts).
export function extendedExpiry(currentIso: string | null | undefined, days = SUBSCRIPTION_DAYS): string {
  const base = currentIso ? new Date(currentIso).getTime() : 0
  const from = Math.max(base, Date.now())
  return new Date(from + days * 86_400_000).toISOString()
}

// Format an ISO date as dd/mm/yyyy for display.
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}
