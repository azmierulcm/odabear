-- ═══════════════════════════════════════════════════════════════════════════
-- JOMODA — Makanjom integration
-- Adds makanjom_restaurant_id so a vendor store can back-link to its
-- Makanjom discovery listing.
-- Safe to run multiple times (IF NOT EXISTS / idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS makanjom_restaurant_id UUID;

COMMENT ON COLUMN vendors.makanjom_restaurant_id IS
  'UUID of the corresponding restaurants row in Makanjom. When set, the Jomoda store page shows a "Discover on Makanjom" back-link.';
