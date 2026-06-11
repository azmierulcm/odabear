-- ============================================================
-- Odabear — Migration: Vendor Profile Fields + Gallery
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. New columns on vendors
alter table vendors
  add column if not exists description  text,
  add column if not exists promo_text   text,
  add column if not exists gallery_urls text[] not null default '{}';

-- ============================================================
-- 2. Storage bucket: vendor-galleries
--    Create manually in Supabase dashboard:
--      Storage → New bucket → Name: vendor-galleries → Public: ON
--
--    Then run these storage policies:
-- ============================================================

create policy "Vendor upload gallery" on storage.objects
  for insert with check (
    bucket_id = 'vendor-galleries'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Vendor update gallery" on storage.objects
  for update using (
    bucket_id = 'vendor-galleries'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Vendor delete gallery" on storage.objects
  for delete using (
    bucket_id = 'vendor-galleries'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public read gallery" on storage.objects
  for select using (bucket_id = 'vendor-galleries');
