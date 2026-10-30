-- ============================================================
-- BigKey · Tours · Phase 2 · Stripe payments
-- Idempotent migration for Supabase SQL Editor / CLI.
-- ============================================================

-- 1. One row per PaymentIntent attempt. The active-attempt index prevents
--    double submits from creating two live PaymentIntents.
create table if not exists public.tours_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  prebooking_id uuid not null references public.tours_pre_bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  stripe_payment_intent_id text,
  stripe_client_secret text,

  amount integer not null check (amount > 0),
  currency text not null default 'AED' check (currency = 'AED'),
  status text not null default 'created'
    check (status in (
      'created',
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
      'requires_capture',
      'succeeded',
      'failed',
      'canceled'
    )),
  error_code text,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tpa_payment_intent_key
  on public.tours_payment_attempts (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists tpa_one_active_per_prebooking
  on public.tours_payment_attempts (prebooking_id)
  where status in (
    'created',
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture'
  );

create index if not exists tpa_prebooking_created_idx
  on public.tours_payment_attempts (prebooking_id, created_at desc);

create index if not exists tpa_user_created_idx
  on public.tours_payment_attempts (user_id, created_at desc);

create unique index if not exists tpb_stripe_payment_intent_key
  on public.tours_pre_bookings (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.tours_payment_attempts enable row level security;

drop policy if exists "tpa_select_own" on public.tours_payment_attempts;
create policy "tpa_select_own" on public.tours_payment_attempts
  for select to authenticated
  using (auth.uid() = user_id);

-- 2. updated_at trigger.
create or replace function public.touch_tour_payment_attempt_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tpa_touch_updated_at on public.tours_payment_attempts;
create trigger tpa_touch_updated_at
  before update on public.tours_payment_attempts
  for each row
  execute function public.touch_tour_payment_attempt_updated_at();

-- 3. Atomically reuse an active attempt or create a new one.
--    The prebooking row lock serializes concurrent createIntent calls.
create or replace function public.begin_tour_payment_attempt(
  p_prebooking_id uuid,
  p_user_id uuid,
  p_amount integer
)
returns public.tours_payment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prebooking public.tours_pre_bookings%rowtype;
  v_attempt public.tours_payment_attempts%rowtype;
  v_expected_amount integer;
begin
  select *
    into v_prebooking
    from public.tours_pre_bookings
   where id = p_prebooking_id
   for update;

  if not found then
    raise exception 'PREBOOKING_NOT_FOUND';
  end if;

  if v_prebooking.user_id <> p_user_id then
    raise exception 'FORBIDDEN';
  end if;

  if v_prebooking.payment_status in ('paid', 'refunded')
     or v_prebooking.status in ('paid', 'confirmed', 'cancelled', 'expired') then
    raise exception 'INVALID_STATE';
  end if;

  v_expected_amount := round(v_prebooking.total_b2c * 100)::integer;
  if p_amount <> v_expected_amount then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  select *
    into v_attempt
    from public.tours_payment_attempts
   where prebooking_id = p_prebooking_id
     and status in (
       'created',
       'requires_payment_method',
       'requires_confirmation',
       'requires_action',
       'processing',
       'requires_capture'
     )
   order by created_at desc
   limit 1;

  if found then
    return v_attempt;
  end if;

  insert into public.tours_payment_attempts (
    prebooking_id,
    user_id,
    amount,
    currency,
    status
  )
  values (
    p_prebooking_id,
    p_user_id,
    p_amount,
    'AED',
    'created'
  )
  returning * into v_attempt;

  update public.tours_pre_bookings
     set status = case when status = 'failed' then 'pending_payment' else status end,
         payment_status = case when payment_status = 'failed' then 'unpaid' else payment_status end
   where id = p_prebooking_id;

  return v_attempt;
end;
$$;

revoke all on function public.begin_tour_payment_attempt(uuid, uuid, integer) from public;
revoke all on function public.begin_tour_payment_attempt(uuid, uuid, integer) from anon;
revoke all on function public.begin_tour_payment_attempt(uuid, uuid, integer) from authenticated;
grant execute on function public.begin_tour_payment_attempt(uuid, uuid, integer) to service_role;

-- 4. Finalize a successful payment and mirror it into public.bookings.
--    Idempotent: a repeated webhook returns the existing booking id.
create or replace function public.finalize_tour_payment(
  p_prebooking_id uuid,
  p_payment_intent_id text,
  p_amount integer,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prebooking public.tours_pre_bookings%rowtype;
  v_booking_id uuid;
  v_expected_amount integer;
  v_meta jsonb;
begin
  select *
    into v_prebooking
    from public.tours_pre_bookings
   where id = p_prebooking_id
   for update;

  if not found then
    raise exception 'PREBOOKING_NOT_FOUND';
  end if;

  if v_prebooking.payment_status = 'refunded'
     or v_prebooking.status in ('cancelled', 'expired') then
    raise exception 'INVALID_STATE';
  end if;

  v_expected_amount := round(v_prebooking.total_b2c * 100)::integer;
  if p_amount <> v_expected_amount then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  if upper(coalesce(p_currency, '')) <> 'AED' then
    raise exception 'CURRENCY_MISMATCH';
  end if;

  if v_prebooking.payment_status = 'paid' then
    select id
      into v_booking_id
      from public.bookings
     where order_ref = v_prebooking.id
       and "Service" = 'Tour'
     order by created_at desc
     limit 1;

    if v_booking_id is not null then
      return v_booking_id;
    end if;
  end if;

  update public.tours_pre_bookings
     set payment_status = 'paid',
         status = 'paid',
         paid_at = coalesce(paid_at, now()),
         stripe_payment_intent_id = p_payment_intent_id
   where id = p_prebooking_id;

  select id
    into v_booking_id
    from public.bookings
   where order_ref = v_prebooking.id
     and "Service" = 'Tour'
   order by created_at desc
   limit 1;

  if v_booking_id is null then
    v_meta := jsonb_build_object(
      'tour_pre_booking_id', v_prebooking.id,
      'payment_status', 'paid',
      'paymentIntentId', p_payment_intent_id,
      'reference', v_prebooking.client_reference_no,
      'passengers',
        v_prebooking.adult_count + v_prebooking.child_count + v_prebooking.infant_count,
      'tour', jsonb_build_object(
        'id', v_prebooking.tour_id,
        'name', v_prebooking.tour_name,
        'city', v_prebooking.tour_city,
        'image', v_prebooking.tour_image,
        'optionId', v_prebooking.option_id,
        'optionName', v_prebooking.option_name,
        'transferId', v_prebooking.transfer_id,
        'transferType', v_prebooking.transfer_type,
        'transferName', v_prebooking.transfer_name,
        'date', v_prebooking.tour_date,
        'timeSlotId', v_prebooking.time_slot_id,
        'startTime', v_prebooking.start_time,
        'adults', v_prebooking.adult_count,
        'children', v_prebooking.child_count,
        'infants', v_prebooking.infant_count,
        'pickup', v_prebooking.pickup,
        'reference', v_prebooking.client_reference_no,
        'uniqueNo', v_prebooking.unique_no,
        'serviceUniqueId', v_prebooking.service_unique_id
      ),
      'contact', jsonb_build_object(
        'firstName', v_prebooking.client->>'firstName',
        'lastName', v_prebooking.client->>'lastName',
        'email', v_prebooking.client->>'email',
        'phoneCountryCode', v_prebooking.client->>'phoneCountryCode',
        'phoneNumber', v_prebooking.client->>'phoneNumber'
      )
    );

    insert into public.bookings (
      user_id,
      name,
      sum,
      "Service",
      status,
      reference,
      order_ref,
      meta,
      currency
    )
    values (
      v_prebooking.user_id,
      coalesce(v_prebooking.tour_name, 'Tour'),
      v_prebooking.total_b2c,
      'Tour',
      'Pending',
      v_prebooking.client_reference_no,
      v_prebooking.id,
      v_meta,
      v_prebooking.currency
    )
    returning id into v_booking_id;
  end if;

  return v_booking_id;
end;
$$;

revoke all on function public.finalize_tour_payment(uuid, text, integer, text) from public;
revoke all on function public.finalize_tour_payment(uuid, text, integer, text) from anon;
revoke all on function public.finalize_tour_payment(uuid, text, integer, text) from authenticated;
grant execute on function public.finalize_tour_payment(uuid, text, integer, text) to service_role;

comment on table public.tours_payment_attempts is
  'Stripe PaymentIntent attempts for tour pre-bookings. Created by tours-payment edge function.';
