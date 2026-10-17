-- ============================================================
-- BigKey · Flights · Sprint 1 · ФИНАЛЬНАЯ ВЕРСИЯ
-- Применяется через Supabase Dashboard → SQL Editor.
-- Идемпотентно: можно выполнять повторно (if not exists).
-- RLS включён для всех таблиц, включая bookings (поведение
-- текущего кода сохраняется 1-в-1).
-- ============================================================

-- 1. Единый Travel Order ID в существующей bookings
alter table public.bookings
  add column if not exists reference text,
  add column if not exists order_ref uuid,
  add column if not exists meta      jsonb,
  add column if not exists currency  text default 'AED';

create index if not exists bookings_user_order_idx on public.bookings (user_id, order_ref);
create index if not exists bookings_reference_idx  on public.bookings (reference);

-- 2. Сессии бронирования перелёта (временные, TTL)
create table if not exists public.flight_booking_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  order_ref      uuid not null default gen_random_uuid(),
  status         text not null default 'SEARCHING'
                 check (status in ('SEARCHING','VERIFIED','PREBOOKED','BOOKING','CONFIRMED','FAILED','EXPIRED')),
  offer_id       text not null,
  prebook_id     text,
  transaction_id text,                      -- всегда последний
  secret_key     text,                      -- Stripe client secret для Payment SDK
  verified_price numeric,
  currency       text not null default 'AED',
  search_params  jsonb,                     -- legs/adults/children/infants/cabin
  journey        jsonb,                     -- { journey, changes } из /flights/verify (refresh-safe)
  passengers     jsonb,
  contact        jsonb,
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Дополнение для уже созданной таблицы (идемпотентно):
alter table public.flight_booking_sessions
  add column if not exists secret_key text,
  add column if not exists journey    jsonb;

create index if not exists fbs_user_status_idx on public.flight_booking_sessions (user_id, status);
create index if not exists fbs_expires_idx     on public.flight_booking_sessions (expires_at);

-- 3. Подтверждённые брони перелётов (постоянные)
create table if not exists public.flight_bookings (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references public.flight_booking_sessions(id) on delete set null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  booking_id       text not null,
  booking_ref      text,                    -- PNR авиакомпании
  status           text,
  total_amount     numeric,
  currency         text not null default 'AED',
  provider_payload jsonb,                   -- полный ответ /flights/bookings
  created_at       timestamptz not null default now()
);

create unique index if not exists fb_booking_id_key on public.flight_bookings (booking_id);
create index if not exists fb_user_idx on public.flight_bookings (user_id);

-- 4. Кэш аэропортов (автокомплит, offline-fallback)
create table if not exists public.flight_airports (
  iata         text primary key,
  icao         text,
  name         text not null,
  city         text,
  country      text,
  state        text,
  tz           text,
  lat          numeric,
  lon          numeric,
  refreshed_at timestamptz not null default now()
);

create index if not exists fa_city_idx on public.flight_airports (lower(city));
create index if not exists fa_name_idx on public.flight_airports (lower(name));

-- 5. RLS новых таблиц
--    Запись сессий/броней — только service-role (edge function flights-booking).
--    Кэш аэропортов наполняет liteapi-proxy (service-role), клиент — только чтение.
alter table public.flight_booking_sessions enable row level security;
alter table public.flight_bookings         enable row level security;
alter table public.flight_airports         enable row level security;

drop policy if exists "fbs_select_own" on public.flight_booking_sessions;
create policy "fbs_select_own" on public.flight_booking_sessions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "fb_select_own" on public.flight_bookings;
create policy "fb_select_own" on public.flight_bookings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "fa_select_all" on public.flight_airports;
create policy "fa_select_all" on public.flight_airports
  for select to anon, authenticated using (true);

-- 6. RLS на bookings (был ОТКЛЮЧЁН — это была дыра)
--    Совместимость с текущим кодом:
--      addBooking()  → insert с user_id = auth.uid() + .select()  ✓ (insert + select политики)
--      orders()      → select своих строк                          ✓
--      анонимы       → пишет только edge function (service-role обходит RLS) ✓
--    Откат, если понадобится: alter table public.bookings disable row level security;
alter table public.bookings enable row level security;

drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own" on public.bookings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings
  for insert to authenticated with check (auth.uid() = user_id);
-- update/delete клиенту закрыты (приложению не нужны)

-- Проверка после применения (необязательно, выполнить отдельно):
-- select tablename, rowsecurity from pg_tables
--  where schemaname='public'
--    and tablename in ('bookings','flight_booking_sessions','flight_bookings','flight_airports');
