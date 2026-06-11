-- ============================================================
-- Odabear — Storage: item-images bucket
-- Create bucket manually in Supabase dashboard:
--   Storage → New bucket → Name: item-images → Public: ON
--
-- Then run these storage policies:
-- ============================================================

create policy "Vendor upload item image" on storage.objects
  for insert with check (
    bucket_id = 'item-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Vendor update item image" on storage.objects
  for update using (
    bucket_id = 'item-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Vendor delete item image" on storage.objects
  for delete using (
    bucket_id = 'item-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public read item image" on storage.objects
  for select using (bucket_id = 'item-images');
