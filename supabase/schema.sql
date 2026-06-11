-- ============================================================
-- Odabear — Digital Menu SaaS Schema
-- Run this in Supabase SQL Editor to set up your database.
-- ============================================================

-- Vendors
create table if not exists vendors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  phone_number text not null,       -- WhatsApp number with country code, e.g. 60123456789
  logo_url     text,
  created_at   timestamptz default now()
);

-- Categories (belong to a vendor)
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors(id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz default now()
);

-- Items (belong to a category)
create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(10, 2) not null,
  image_url    text,
  is_available boolean not null default true,
  sort_order   int     not null default 0,
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table vendors    enable row level security;
alter table categories enable row level security;
alter table items      enable row level security;

-- Public read-only access for all three tables
create policy "Public read vendors"    on vendors    for select using (true);
create policy "Public read categories" on categories for select using (true);
create policy "Public read items"      on items      for select using (true);

-- ============================================================
-- Seed — Demo vendor for local testing  (/demo)
-- ============================================================

insert into vendors (id, name, slug, phone_number)
values ('00000000-0000-0000-0000-000000000001', 'Demo Kopitiam', 'demo', '60123456789')
on conflict (slug) do nothing;

insert into categories (id, vendor_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Drinks', 0),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Food',   1)
on conflict (id) do nothing;

insert into items (category_id, name, description, price, image_url, is_available, sort_order)
values
  ('00000000-0000-0000-0000-000000000010', 'Teh Tarik',  'Frothy pulled milk tea',                       3.50, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop&q=80', true,  0),
  ('00000000-0000-0000-0000-000000000010', 'Kopi O',     'Black coffee with sugar',                      2.50, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop&q=80', true,  1),
  ('00000000-0000-0000-0000-000000000011', 'Nasi Lemak', 'Coconut rice with sambal, egg, and anchovies', 8.00, 'https://images.unsplash.com/photo-1512058533999-a0cb7b53da59?w=400&h=400&fit=crop&q=80', true,  0),
  ('00000000-0000-0000-0000-000000000011', 'Roti Canai', 'Flaky flatbread with dhal curry',              2.00, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=400&fit=crop&q=80', false, 1);
