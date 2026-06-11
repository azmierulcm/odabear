-- ─────────────────────────────────────────────────────────────────────────
-- Lock vendor billing columns (P0 security fix)
-- Paste into Supabase Dashboard → SQL Editor → Run. Safe to re-run.
--
-- Problem: the "Vendor update own" RLS policy lets a logged-in vendor update
-- ANY column on their own row — including subscription_status, trial_ends_at,
-- is_active and is_featured. With browser dev tools + their own JWT, a vendor
-- could grant themselves a free lifetime subscription.
--
-- Fix: a trigger that rejects changes to those columns unless the caller is
-- the service role (server actions / cron / admin). The dashboard UI never
-- writes these columns from the client, so legitimate flows are unaffected.
-- RLS bypass does NOT skip triggers, so this also guards future policy drift.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.protect_vendor_billing_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.role(), '');
begin
  -- Service role (adminSupabase) and direct SQL (postgres) pass through.
  -- Only end-user JWTs (anon / authenticated) are restricted.
  if jwt_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- New self-registered vendors always start as a fresh trial,
    -- regardless of what the client tried to send.
    new.subscription_status := 'trial';
    new.trial_ends_at       := now() + interval '30 days';
    new.is_featured         := false;
    return new;
  end if;

  -- UPDATE: billing/visibility columns are server-managed only.
  if new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at    is distinct from old.trial_ends_at
     or new.is_active        is distinct from old.is_active
     or new.is_featured      is distinct from old.is_featured then
    raise exception 'These fields are managed by Jomoda. Please contact support.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_vendor_billing_cols on public.vendors;
create trigger protect_vendor_billing_cols
  before insert or update on public.vendors
  for each row execute function public.protect_vendor_billing_cols();

-- ── Verify ──────────────────────────────────────────────────────────────
-- Should list the trigger:
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.vendors'::regclass
  and tgname = 'protect_vendor_billing_cols';
