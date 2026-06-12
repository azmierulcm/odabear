-- ============================================================
-- Odabear — Migration: Delivery fee config
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Vendor-level delivery fee config
alter table vendors
  add column if not exists delivery_fee      numeric(10,2) not null default 0,
  add column if not exists free_delivery_min numeric(10,2);

-- 2. Record the delivery fee actually charged on each order
alter table orders
  add column if not exists delivery_fee numeric(10,2) not null default 0;
