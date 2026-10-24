-- ============================================================
-- BigKey · Hotels · идемпотентность /rates/book
-- Одна строка = одна пара capability-токенов (prebookId + transactionId).
-- В БД хранятся только SHA-256-хеши, не сами токены.
-- RLS включён без policy: доступ только через service role.
-- ============================================================

create table if not exists public.hotel_booking_attempts (
  id                uuid primary key default gen_random_uuid(),
  prebook_hash      text not null,
  transaction_hash  text not null,
  status            text not null default 'PROCESSING'
                    check (status in ('PROCESSING','CONFIRMED','FAILED','UNKNOWN')),
  response          jsonb,
  response_status   integer,
  error_code        text,
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists hba_capability_key
  on public.hotel_booking_attempts (prebook_hash, transaction_hash);

create index if not exists hba_status_updated_idx
  on public.hotel_booking_attempts (status, updated_at);

alter table public.hotel_booking_attempts enable row level security;

comment on table public.hotel_booking_attempts is
  'Idempotency ledger for hotels /rates/book. Only hashed prebookId/transactionId are stored.';
