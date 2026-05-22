-- Per-room / per-service date blocking
-- Run this once in Supabase Dashboard → SQL Editor

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS blocked_dates text[] DEFAULT '{}';
