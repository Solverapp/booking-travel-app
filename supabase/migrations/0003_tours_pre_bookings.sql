-- ============================================================
-- BigKey · Tours · Phase 1 · Pre-bookings
-- Idempotent migration for Supabase SQL Editor / CLI.
-- ============================================================

-- 1. Human-readable references for Rayna bookings.
create sequence if not exists public.tour_booking_unique_no_seq
  as bigint start with 100000 increment by 1;

create sequence if not exists public.tour_booking_service_unique_id_seq
  as bigint start with 100000 increment by 1;

create sequence if not exists public.tour_booking_client_ref_seq
  as bigint start with 100000 increment by 1;

revoke all on sequence public.tour_booking_unique_no_seq from public;
revoke all on sequence public.tour_booking_service_unique_id_seq from public;
revoke all on sequence public.tour_booking_client_ref_seq from public;
grant usage, select on sequence public.tour_booking_unique_no_seq to service_role;
grant usage, select on sequence public.tour_booking_service_unique_id_seq to service_role;
grant usage, select on sequence public.tour_booking_client_ref_seq to service_role;

-- 2. Pre-booking storage. The row is created before payment and is only
--    visible to its owner. Edge functions use service_role for writes.
create table if not exists public.tours_pre_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'confirmed', 'failed', 'expired', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'processing', 'paid', 'failed', 'refunded')),
  currency text not null default 'AED'
    check (currency = 'AED'),

  unique_no bigint not null,
  service_unique_id bigint not null,
  client_reference_no text not null,

  tour_id text not null,
  tour_name text,
  tour_city text,
  tour_image text,

  option_id text not null,
  option_name text,
  transfer_id text not null,
  transfer_type text not null default 'other'
    check (transfer_type in ('without', 'sharing', 'private', 'other')),
  transfer_name text,

  tour_date date not null,
  time_slot_id text not null default '0',
  start_time text,
  adult_count integer not null default 1 check (adult_count >= 1),
  child_count integer not null default 0 check (child_count >= 0),
  infant_count integer not null default 0 check (infant_count >= 0),
  pickup text not null default '',

  adult_rate_b2b numeric(12, 2) not null,
  child_rate_b2b numeric(12, 2) not null default 0,
  infant_rate_b2b numeric(12, 2) not null default 0,
  adult_rate_b2c numeric(12, 2) not null,
  child_rate_b2c numeric(12, 2) not null default 0,
  service_total_b2b numeric(12, 2) not null,
  total_b2c numeric(12, 2) not null,

  client jsonb not null,
  rayna_payload jsonb not null,
  tour_snapshot jsonb,

  stripe_payment_intent_id text,
  stripe_client_secret text,
  paid_at timestamptz,

  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tpb_unique_no_key
  on public.tours_pre_bookings (unique_no);
create unique index if not exists tpb_service_unique_id_key
  on public.tours_pre_bookings (service_unique_id);
create unique index if not exists tpb_client_reference_no_key
  on public.tours_pre_bookings (client_reference_no);
create index if not exists tpb_user_created_idx
  on public.tours_pre_bookings (user_id, created_at desc);
create index if not exists tpb_status_idx
  on public.tours_pre_bookings (status, payment_status);
create index if not exists tpb_tour_date_idx
  on public.tours_pre_bookings (tour_date);

alter table public.tours_pre_bookings enable row level security;

drop policy if exists "tpb_select_own" on public.tours_pre_bookings;
create policy "tpb_select_own" on public.tours_pre_bookings
  for select to authenticated
  using (auth.uid() = user_id);

-- 3. updated_at trigger.
create or replace function public.touch_tour_pre_booking_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tpb_touch_updated_at on public.tours_pre_bookings;
create trigger tpb_touch_updated_at
  before update on public.tours_pre_bookings
  for each row
  execute function public.touch_tour_pre_booking_updated_at();

-- 4. Atomic allocation of all three Rayna references.
create or replace function public.next_tour_booking_refs()
returns table (
  unique_no bigint,
  service_unique_id bigint,
  client_reference_no text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unique_no bigint;
  v_service_unique_id bigint;
  v_client_reference_no text;
begin
  v_unique_no := nextval('public.tour_booking_unique_no_seq');
  v_service_unique_id := nextval('public.tour_booking_service_unique_id_seq');
  v_client_reference_no := lpad(nextval('public.tour_booking_client_ref_seq')::text, 6, '0');

  return query
  select v_unique_no, v_service_unique_id, v_client_reference_no;
end;
$$;

revoke all on function public.next_tour_booking_refs() from public;
revoke all on function public.next_tour_booking_refs() from anon;
revoke all on function public.next_tour_booking_refs() from authenticated;
grant execute on function public.next_tour_booking_refs() to service_role;

comment on table public.tours_pre_bookings is
  'Tour checkout pre-bookings. Created by tours-booking edge function before payment; mirrored to bookings after payment.';
