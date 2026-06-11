-- ============================================================
-- Odabear — Migration: Orders + Payment Methods
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add payment_methods to vendors
alter table vendors
  add column if not exists payment_methods jsonb not null default '[]'::jsonb;

-- 2. Orders table
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid references vendors(id) on delete cascade not null,
  customer_name  text not null,
  customer_phone text not null default '',
  items          jsonb not null,           -- [{name, price, quantity}]
  total_price    numeric(10,2) not null,
  status         text not null default 'pending'
                 check (status in ('pending','accepted','cancelled','completed')),
  notes          text,
  created_at     timestamptz default now()
);

-- 3. RLS on orders
alter table orders enable row level security;

-- Anyone can place an order for an active vendor (no auth required)
create policy "Public place order" on orders
  for insert with check (
    exists (select 1 from vendors v where v.id = vendor_id and v.is_active = true)
  );

-- Vendors read their own orders
create policy "Vendor read own orders" on orders
  for select using (
    exists (select 1 from vendors v where v.id = vendor_id and v.user_id = auth.uid())
  );

-- Vendors update status on their own orders
create policy "Vendor update own orders" on orders
  for update using (
    exists (select 1 from vendors v where v.id = vendor_id and v.user_id = auth.uid())
  );

-- 4. Enable realtime for orders
alter publication supabase_realtime add table orders;
