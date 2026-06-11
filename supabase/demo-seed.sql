-- ============================================================
-- Odabear — Demo Showroom Seed
-- Three premium vendors covering all three business_type values.
-- Run this in Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  -- Vendor IDs
  v_restaurant  uuid := gen_random_uuid();
  v_retail      uuid := gen_random_uuid();
  v_booking     uuid := gen_random_uuid();

  -- Restaurant category IDs
  cat_mains     uuid := gen_random_uuid();
  cat_beverages uuid := gen_random_uuid();

  -- Retail category IDs
  cat_fragrance uuid := gen_random_uuid();
  cat_ceramics  uuid := gen_random_uuid();

  -- Booking category ID
  cat_stays     uuid := gen_random_uuid();

BEGIN

-- ============================================================
-- VENDOR 1 — Bakarizu Premium Yakiniku (restaurant)
-- ============================================================

INSERT INTO vendors (
  id, name, slug, phone_number, is_active, business_type,
  description, promo_text,
  gallery_urls, payment_methods, blocked_dates
) VALUES (
  v_restaurant,
  'Bakarizu Premium Yakiniku',
  'demo-restaurant',
  '60123456789',
  true,
  'restaurant',
  'Experience the art of Japanese charcoal grilling. We source our Wagyu directly from Kagoshima Prefecture and our Kurobuta pork from heritage farms. Every cut is aged, marinated, and served at your table with premium bincho-tan charcoal.',
  '🔥 Free Delivery in Cyberjaya for orders over RM 50',
  ARRAY[
    'https://images.unsplash.com/photo-1544025162-d76538c3d0b2?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85&fit=crop'
  ],
  '[]'::jsonb,
  '{}'::date[]
);

-- Categories
INSERT INTO categories (id, vendor_id, name, sort_order) VALUES
  (cat_mains,     v_restaurant, 'Signature Mains', 0),
  (cat_beverages, v_restaurant, 'Beverages',       1);

-- Items — Signature Mains
INSERT INTO items (id, category_id, name, description, price, image_url, is_available, sort_order) VALUES
  (
    gen_random_uuid(), cat_mains,
    'A5 Wagyu Short Rib',
    'Kagoshima A5 Grade Wagyu, marbled to perfection. 150g. Served with house tare and smoked salt.',
    88.00,
    'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=600&fit=crop&q=85',
    true, 0
  ),
  (
    gen_random_uuid(), cat_mains,
    'Kurobuta Pork Collar',
    'Heritage Berkshire pork collar, marinated 24 hours in our secret miso blend. 200g.',
    52.00,
    'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=600&fit=crop&q=85',
    true, 1
  );

-- Items — Beverages
INSERT INTO items (id, category_id, name, description, price, image_url, is_available, sort_order) VALUES
  (
    gen_random_uuid(), cat_beverages,
    'Yuzu Honey Lemonade',
    'House-pressed yuzu with Okinawan raw honey, sparkling water, and fresh mint. Served tall.',
    18.00,
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=600&fit=crop&q=85',
    true, 0
  ),
  (
    gen_random_uuid(), cat_beverages,
    'Hojicha Oat Latte',
    'Premium roasted Uji hojicha, double-steeped and paired with locally sourced oat milk.',
    16.00,
    'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&h=600&fit=crop&q=85',
    true, 1
  );


-- ============================================================
-- VENDOR 2 — Lumina Minimalist Living (retail)
-- ============================================================

INSERT INTO vendors (
  id, name, slug, phone_number, is_active, business_type,
  description, promo_text,
  gallery_urls, payment_methods, blocked_dates
) VALUES (
  v_retail,
  'Lumina Minimalist Living',
  'demo-retail',
  '60198765432',
  true,
  'retail',
  'Lumina curates slow-made objects for intentional homes. Each piece is handcrafted by independent Malaysian and Japanese artisans using natural materials — soy wax, stoneware clay, and sustainably sourced timber. We believe your home should feel like a exhale.',
  '✨ Same-day shipping in KL. 10% off your first order — use code LUMINA10',
  ARRAY[
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=85&fit=crop'
  ],
  '[]'::jsonb,
  '{}'::date[]
);

-- Categories
INSERT INTO categories (id, vendor_id, name, sort_order) VALUES
  (cat_fragrance, v_retail, 'Home Fragrance', 0),
  (cat_ceramics,  v_retail, 'Ceramics',       1);

-- Items — Home Fragrance
INSERT INTO items (id, category_id, name, description, price, image_url, is_available, sort_order) VALUES
  (
    gen_random_uuid(), cat_fragrance,
    'Hinoki Forest Soy Candle',
    'Hand-poured 100% soy wax with Japanese hinoki cedar and white musk. 220g, 55-hour burn time.',
    65.00,
    'https://images.unsplash.com/photo-1574484619-6157893d6f4d?w=600&h=600&fit=crop&q=85',
    true, 0
  ),
  (
    gen_random_uuid(), cat_fragrance,
    'Sakura Mist Reed Diffuser',
    'Alcohol-free diffuser oil with cherry blossom, rice water, and a base of warm sandalwood. Lasts 90 days.',
    89.00,
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop&q=85',
    true, 1
  );

-- Items — Ceramics
INSERT INTO items (id, category_id, name, description, price, image_url, is_available, sort_order) VALUES
  (
    gen_random_uuid(), cat_ceramics,
    'Handthrown Matcha Bowl',
    'Wheel-thrown stoneware with a matte iron-grey glaze. Food safe. Each piece is unique — slight variations are part of its beauty.',
    120.00,
    'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=600&h=600&fit=crop&q=85',
    true, 0
  ),
  (
    gen_random_uuid(), cat_ceramics,
    'Wabi-Sabi Bud Vase Set (3)',
    'Set of three hand-shaped bud vases in muted earth tones. Perfect for dried botanicals and pampas grass.',
    95.00,
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop&q=85',
    true, 1
  );


-- ============================================================
-- VENDOR 3 — The Alpine Loft Retreat (booking)
-- ============================================================

INSERT INTO vendors (
  id, name, slug, phone_number, is_active, business_type,
  description, promo_text,
  gallery_urls, payment_methods, blocked_dates
) VALUES (
  v_booking,
  'The Alpine Loft Retreat',
  'demo-booking',
  '60111234567',
  true,
  'booking',
  'Nestled in the Cameron Highlands at 1,500m elevation, The Alpine Loft offers a collection of architect-designed stays surrounded by old-growth pine forest and tea plantations. Each space is designed around silence, warmth, and the kind of rest that actually restores you.',
  '🏔️ Book 3 nights, get the 4th night free. Instant WhatsApp confirmation.',
  ARRAY[
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85&fit=crop'
  ],
  '[]'::jsonb,
  '{}'::date[]
);

-- Category
INSERT INTO categories (id, vendor_id, name, sort_order) VALUES
  (cat_stays, v_booking, 'Available Stays', 0);

-- Items — Stays
INSERT INTO items (id, category_id, name, description, price, image_url, is_available, sort_order) VALUES
  (
    gen_random_uuid(), cat_stays,
    'The Loft Studio',
    'A self-contained studio with a queen bed, wood-burning fireplace, kitchenette, and a private timber deck overlooking the valley. Perfect for couples or solo retreats. Sleeps 2.',
    280.00,
    'https://images.unsplash.com/photo-1600596542815-0c188dc40925?w=600&h=600&fit=crop&q=85',
    true, 0
  ),
  (
    gen_random_uuid(), cat_stays,
    'The Alpine Suite',
    'Our flagship two-bedroom suite with panoramic floor-to-ceiling windows, a soaking tub, a full kitchen, and a wraparound verandah. Includes a welcome hamper of local highland produce. Sleeps 4.',
    420.00,
    'https://images.unsplash.com/photo-1631049035182-249067d7ef29?w=600&h=600&fit=crop&q=85',
    true, 1
  );

END $$;
