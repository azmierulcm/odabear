// Shared by the storefront (for display) and the checkout server action
// (for re-pricing) so both sides agree on the delivery fee for a given
// subtotal.
//
// Supabase returns `numeric` columns as strings, so coerce defensively —
// callers may pass the raw vendor row straight through.
export function computeDeliveryFee(
  subtotal: number,
  vendor: { delivery_fee: number; free_delivery_min: number | null },
): number {
  const fee = Number(vendor.delivery_fee) || 0
  const freeMin = vendor.free_delivery_min != null ? Number(vendor.free_delivery_min) : null
  if (freeMin != null && subtotal >= freeMin) return 0
  return fee
}
