-- ============================================================
-- Trial & Subscription system
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add trial columns to vendors
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS trial_ends_at  timestamptz DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'expired'));

-- 2. Back-fill existing vendors: trial started at created_at
UPDATE vendors
SET
  trial_ends_at        = COALESCE(created_at, NOW()) + INTERVAL '30 days',
  subscription_status  = CASE
                           WHEN is_active THEN 'trial'
                           ELSE 'expired'
                         END
WHERE trial_ends_at IS NULL;

-- 3. Rebuild vendor_stats view to expose trial columns
CREATE OR REPLACE VIEW vendor_stats AS
SELECT
  v.id,
  v.vendor_number,
  v.name,
  v.slug,
  v.phone_number,
  v.logo_url,
  v.is_active,
  v.user_id,
  v.created_at,
  v.trial_ends_at,
  v.subscription_status,
  COUNT(DISTINCT i.id) AS item_count
FROM vendors v
LEFT JOIN categories c ON c.vendor_id = v.id
LEFT JOIN items      i ON i.category_id = c.id
GROUP BY v.id;

-- ============================================================
-- 4. Daily cron job via pg_cron + pg_net
--    Enable both extensions first in Supabase:
--      Dashboard → Database → Extensions → pg_cron  ✓
--      Dashboard → Database → Extensions → pg_net   ✓
--
--    Then replace YOUR_DOMAIN and YOUR_CRON_SECRET below:
-- ============================================================

-- SELECT cron.schedule(
--   'expire-trials',
--   '0 2 * * *',   -- runs at 2 AM UTC every day
--   $$
--     SELECT net.http_get(
--       url := 'https://YOUR_DOMAIN/api/expire-trials?secret=YOUR_CRON_SECRET'
--     )
--   $$
-- );

-- ============================================================
-- 5. Expand orders status check constraint (if not done yet)
-- ============================================================
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check
--   CHECK (status IN ('pending','pending_whatsapp','accepted','cancelled','completed'));
