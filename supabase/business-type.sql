-- ============================================================
-- Odabear — Migration: Business Type + Bookings
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add business_type column to vendors
alter table vendors
  add column if not exists business_type text
  check (business_type in ('restaurant', 'retail', 'booking'));

-- 2. Add blocked_dates for booking vendors (array of ISO date strings)
alter table vendors
  add column if not exists blocked_dates date[] not null default '{}';

-- 3. Bookings table (for booking-type vendors)
create table if not exists bookings (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid references vendors(id) on delete cascade not null,
  customer_name  text not null,
  customer_phone text not null default '',
  service_name   text not null default '',
  start_date     date not null,
  end_date       date not null,
  notes          text,
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'cancelled')),
  created_at     timestamptz default now()
);

alter table bookings enable row level security;

-- Public: anyone can create a booking for an active vendor
create policy "Public create booking" on bookings
  for insert with check (
    exists (select 1 from vendors v where v.id = vendor_id and v.is_active = true)
  );

-- Vendor: read their own bookings
create policy "Vendor read own bookings" on bookings
  for select using (
    exists (select 1 from vendors v where v.id = vendor_id and v.user_id = auth.uid())
  );

-- Vendor: update status on their own bookings
create policy "Vendor update own bookings" on bookings
  for update using (
    exists (select 1 from vendors v where v.id = vendor_id and v.user_id = auth.uid())
  );

-- Enable realtime for bookings
alter publication supabase_realtime add table bookings;
