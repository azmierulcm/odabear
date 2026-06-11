-- ============================================================
-- Odabear — Migration: Auth + RLS + Admin Stats View
-- Run this in Supabase SQL Editor AFTER the initial schema.sql
-- ============================================================

-- 1. New columns on vendors
alter table vendors
  add column if not exists user_id   uuid references auth.users(id) on delete set null,
  add column if not exists is_active boolean not null default true;

-- 2. Drop old permissive read-only policies
drop policy if exists "Public read vendors"    on vendors;
drop policy if exists "Public read categories" on categories;
drop policy if exists "Public read items"      on items;

-- ============================================================
-- 3. Vendors RLS
-- ============================================================

-- Public: only active vendors (unauthenticated menu visitors)
create policy "Public read active vendors" on vendors
  for select using (is_active = true);

-- Vendor: can always read their own record (even if inactive)
create policy "Vendor read own" on vendors
  for select using (auth.uid() = user_id);

-- Vendor: can create their own vendor profile
create policy "Vendor insert own" on vendors
  for insert with check (auth.uid() = user_id);

-- Vendor: can update their own vendor profile
create policy "Vendor update own" on vendors
  for update using (auth.uid() = user_id);

-- ============================================================
-- 4. Categories RLS
-- ============================================================

-- Public: categories of active vendors only
create policy "Public read categories" on categories
  for select using (
    exists (
      select 1 from vendors v
      where v.id = categories.vendor_id and v.is_active = true
    )
  );

-- Vendor: full CRUD on their own categories
create policy "Vendor manage own categories" on categories
  for all
  using (
    exists (
      select 1 from vendors v
      where v.id = categories.vendor_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from vendors v
      where v.id = categories.vendor_id and v.user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Items RLS
-- ============================================================

-- Public: items of active vendors only
create policy "Public read items" on items
  for select using (
    exists (
      select 1 from categories c
      join vendors v on v.id = c.vendor_id
      where c.id = items.category_id and v.is_active = true
    )
  );

-- Vendor: full CRUD on their own items
create policy "Vendor manage own items" on items
  for all
  using (
    exists (
      select 1 from categories c
      join vendors v on v.id = c.vendor_id
      where c.id = items.category_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from categories c
      join vendors v on v.id = c.vendor_id
      where c.id = items.category_id and v.user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. Admin stats view (queried server-side with service role key)
-- ============================================================

create or replace view vendor_stats as
select
  v.id,
  v.name,
  v.slug,
  v.phone_number,
  v.logo_url,
  v.is_active,
  v.user_id,
  v.created_at,
  count(distinct i.id) as item_count
from vendors v
left join categories c on c.vendor_id = v.id
left join items i on i.category_id = c.id
group by v.id;
