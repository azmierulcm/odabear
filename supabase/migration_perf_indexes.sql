-- ─────────────────────────────────────────────────────────────────────────
-- P0 performance indexes — targets the hot query paths identified in the audit.
-- Paste into Supabase Dashboard → SQL Editor → Run (correct project!).
-- Idempotent: CREATE INDEX IF NOT EXISTS + CONCURRENTLY-safe names.
-- ─────────────────────────────────────────────────────────────────────────

-- Order payment-status page (/order/[token]) is force-dynamic and looks the
-- order up by token on EVERY view → without this it's a full table scan.
create index if not exists orders_order_token_idx
  on public.orders (order_token);

-- Vendor dashboard lists orders newest-first: .eq(vendor_id).order(created_at desc)
-- Composite covers both the filter and the sort in one index.
create index if not exists orders_vendor_created_idx
  on public.orders (vendor_id, created_at desc);

-- Booking payment-status page (/booking/[token]) — same token-lookup story.
create index if not exists bookings_booking_token_idx
  on public.bookings (booking_token);

-- The bookings table had NO indexes at all. Dashboard lists + analytics filter
-- by vendor_id and sort by recency.
create index if not exists bookings_vendor_created_idx
  on public.bookings (vendor_id, created_at desc);

-- Storefront availability query: .eq(vendor_id).neq(status,'cancelled').gte(end_date, today)
create index if not exists bookings_vendor_enddate_idx
  on public.bookings (vendor_id, end_date);
