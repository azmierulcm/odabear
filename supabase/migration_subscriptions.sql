-- ─────────────────────────────────────────────────────────────────────────
-- Self-serve vendor subscriptions
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run (IF NOT EXISTS / idempotent upsert of the singleton row).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Platform billing config — a single row (id = 1) holding Jomoda's own
--    DuitNow QR that every vendor pays into. The payload lets us render an
--    amount-prefilled (dynamic) QR; qr_url is the original image fallback.
create table if not exists public.platform_settings (
  id               smallint primary key default 1,
  duitnow_payload  text,
  duitnow_name     text,
  qr_url           text,
  updated_at       timestamptz not null default now(),
  constraint platform_settings_singleton check (id = 1)
);

insert into public.platform_settings (id) values (1)
  on conflict (id) do nothing;

-- 2. Subscription payment history — one row per vendor renewal attempt.
--    With auto-activation, the vendor is flipped to active on upload; the
--    row's status lets the admin audit and (if a proof is fake) reject later.
create table if not exists public.subscription_payments (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors(id) on delete cascade,
  amount       numeric not null default 150,
  proof_url    text,
  status       text not null default 'submitted'
                 check (status in ('submitted', 'confirmed', 'rejected')),
  period_days  integer not null default 30,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists subscription_payments_vendor_idx
  on public.subscription_payments (vendor_id);
create index if not exists subscription_payments_status_idx
  on public.subscription_payments (status);
create index if not exists subscription_payments_created_idx
  on public.subscription_payments (created_at desc);

-- 3. RLS: lock both tables down. All reads/writes go through server actions
--    using the service-role key (adminSupabase), which bypasses RLS — same
--    pattern as orders/bookings. No anon/public policies are needed.
alter table public.platform_settings     enable row level security;
alter table public.subscription_payments enable row level security;
