-- ============================================================
-- BigKey · Favorites (tours + hotels)
-- Idempotent migration for Supabase SQL Editor / CLI.
-- ============================================================

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_type text not null
    check (service_type in ('tour', 'hotel')),
  item_id text not null,
  item_name text,
  item_image text,
  item_city text,
  item_country text,
  item_price numeric(12, 2),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),

  unique (user_id, service_type, item_id)
);

alter table public.user_favorites enable row level security;

DROP POLICY IF EXISTS user_favorites_select_own
  on public.user_favorites
  for select to authenticated
  using (auth.uid() = user_id);

DROP POLICY IF EXISTS user_favorites_insert_own
  on public.user_favorites
  for insert to authenticated
  with check (auth.uid() = user_id);

DROP POLICY IF EXISTS user_favorites_delete_own
  on public.user_favorites
  for delete to authenticated
  using (auth.uid() = user_id);
