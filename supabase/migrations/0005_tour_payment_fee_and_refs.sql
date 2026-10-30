-- ============================================================
-- BigKey · Tours · Payment fee + unique Rayna references
-- ============================================================

-- 1. Payment fee snapshot. The customer pays the gross amount;
--    the service total remains unchanged for provider accounting.
alter table public.tours_pre_bookings
  add column if not exists payment_fee_b2c numeric(10,2) not null default 0,
  add column if not exists payment_total_b2c numeric(10,2);

comment on column public.tours_pre_bookings.payment_fee_b2c is
  'Card processing fee charged to the customer on top of total_b2c.';
comment on column public.tours_pre_bookings.payment_total_b2c is
  'Gross amount sent to Stripe (total_b2c + payment_fee_b2c).';

-- 2. Stripe UAE gross-up: 3.9% + AED 1.00 + 5% VAT on the fee.
--    Ceil to fils so the net amount is never below the service total.
create or replace function public.tour_payment_total_b2c(p_service_total numeric)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_service_total, 0) <= 0 then 0::numeric
    else ceil(
      ((p_service_total + (1.00 * 1.05)) / (1 - (0.039 * 1.05))) * 100
    ) / 100
  end;
$$;

revoke all on function public.tour_payment_total_b2c(numeric) from public;
revoke all on function public.tour_payment_total_b2c(numeric) from anon;
revoke all on function public.tour_payment_total_b2c(numeric) from authenticated;
grant execute on function public.tour_payment_total_b2c(numeric) to service_role;

-- 3. Allocate the gross amount and store the fee snapshot.
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
  v_payment_total numeric(10,2);
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

  v_payment_total := public.tour_payment_total_b2c(v_prebooking.total_b2c);
  v_expected_amount := round(v_payment_total * 100)::integer;

  if v_expected_amount <= 0 or p_amount <> v_expected_amount then
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
    if v_attempt.amount <> v_expected_amount then
      raise exception 'AMOUNT_MISMATCH';
    end if;

    update public.tours_pre_bookings
       set payment_fee_b2c = v_payment_total - v_prebooking.total_b2c,
           payment_total_b2c = v_payment_total
     where id = p_prebooking_id;

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
    v_expected_amount,
    'AED',
    'created'
  )
  returning * into v_attempt;

  update public.tours_pre_bookings
     set payment_fee_b2c = v_payment_total - v_prebooking.total_b2c,
         payment_total_b2c = v_payment_total,
         status = case when status = 'failed' then 'pending_payment' else status end,
         payment_status = case when payment_status = 'failed' then 'unpaid' else payment_status end
   where id = p_prebooking_id;

  return v_attempt;
end;
$$;

revoke all on function public.begin_tour_payment_attempt(uuid, uuid, integer) from public;
revoke all on function public.begin_tour_payment_attempt(uuid, uuid, integer) from anon;
revoke all on function public.begin_tour_payment_attempt(uuid, uuid, integer) from authenticated;
grant execute on function public.begin_tour_payment_attempt(uuid, uuid, integer) to service_role;

-- 4. Validate the gross amount and record the fee breakdown in bookings.meta.
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

  v_expected_amount := round(
    coalesce(v_prebooking.payment_total_b2c, v_prebooking.total_b2c) * 100
  )::integer;

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
      'serviceTotal', v_prebooking.total_b2c,
      'paymentFee', coalesce(
        v_prebooking.payment_fee_b2c,
        v_prebooking.payment_total_b2c - v_prebooking.total_b2c,
        0
      ),
      'paymentTotal', coalesce(v_prebooking.payment_total_b2c, v_prebooking.total_b2c),
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
      coalesce(v_prebooking.payment_total_b2c, v_prebooking.total_b2c),
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

-- 5. One sequence, three consecutive values per booking. This guarantees
--    uniqueNo, serviceUniqueId and clientReferenceNo never repeat each other
--    or any value already issued.
create sequence if not exists public.tour_booking_ref_seq
  as bigint start with 100001 increment by 1;

revoke all on sequence public.tour_booking_ref_seq from public;
grant usage, select on sequence public.tour_booking_ref_seq to service_role;

do $$
declare
  v_start bigint;
begin
  select greatest(
    coalesce(max(unique_no), 0),
    coalesce(max(service_unique_id), 0),
    coalesce(max(
      case
        when client_reference_no ~ '^[0-9]+$' then client_reference_no::bigint
        else 0
      end
    ), 0),
    99999
  ) + 1
  into v_start
  from public.tours_pre_bookings;

  perform setval('public.tour_booking_ref_seq', v_start, false);
end;
$$;

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
  v_unique_no := nextval('public.tour_booking_ref_seq');
  v_service_unique_id := nextval('public.tour_booking_ref_seq');
  v_client_reference_no := lpad(nextval('public.tour_booking_ref_seq')::text, 6, '0');

  return query
  select v_unique_no, v_service_unique_id, v_client_reference_no;
end;
$$;

revoke all on function public.next_tour_booking_refs() from public;
revoke all on function public.next_tour_booking_refs() from anon;
revoke all on function public.next_tour_booking_refs() from authenticated;
grant execute on function public.next_tour_booking_refs() to service_role;

-- The old per-field sequences are no longer used. Dropping them prevents
-- accidental reuse of overlapping values.
drop sequence if exists public.tour_booking_unique_no_seq;
drop sequence if exists public.tour_booking_service_unique_id_seq;
drop sequence if exists public.tour_booking_client_ref_seq;
