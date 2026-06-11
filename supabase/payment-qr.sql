-- ============================================================
-- Odabear — Storage: payment-qr bucket
-- Create bucket manually in Supabase dashboard:
--   Storage → New bucket → Name: payment-qr → Public: ON
--
-- Then run these storage policies:
-- ============================================================

create policy "Vendor upload QR code" on storage.objects
  for insert with check (
    bucket_id = 'payment-qr'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Vendor update QR code" on storage.objects
  for update using (
    bucket_id = 'payment-qr'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Vendor delete QR code" on storage.objects
  for delete using (
    bucket_id = 'payment-qr'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Public read QR code" on storage.objects
  for select using (bucket_id = 'payment-qr');
