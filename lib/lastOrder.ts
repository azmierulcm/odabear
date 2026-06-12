// Remembers a customer's most recent order per vendor, in the browser only.
// Customers have no account, so "Order again" relies on localStorage rather than
// any server-side history. We store just enough to rebuild the cart (item ids +
// quantities) and pre-fill checkout — prices are re-resolved against the live
// menu at repeat time, never trusted from storage.

export interface SavedOrderItem {
  id: string
  name: string        // kept only for the banner summary if an item later vanishes
  quantity: number
}

export interface SavedOrderCustomer {
  name: string
  phone: string
  deliveryType: 'pickup' | 'delivery'
  address: string
  notes: string
}

export interface SavedOrder {
  items: SavedOrderItem[]
  customer: SavedOrderCustomer
  placedAt: number          // epoch ms
  shortOrderId?: string
}

const KEY_PREFIX = 'odabear:lastOrder:'
// Drop anything older than 60 days so stale carts (renamed/removed items) don't linger.
const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000

function key(vendorId: string): string {
  return `${KEY_PREFIX}${vendorId}`
}

export function saveLastOrder(vendorId: string, order: SavedOrder): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(vendorId), JSON.stringify(order))
  } catch {
    // Private mode / quota / disabled storage — repeat-order is a convenience, fail silent.
  }
}

export function getLastOrder(vendorId: string): SavedOrder | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(vendorId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedOrder
    if (!parsed?.items?.length || typeof parsed.placedAt !== 'number') return null
    if (Date.now() - parsed.placedAt > MAX_AGE_MS) {
      clearLastOrder(vendorId)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearLastOrder(vendorId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key(vendorId))
  } catch {
    /* ignore */
  }
}

// "3 days ago", "Yesterday", "Just now" — plain, no library.
export function relativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}
