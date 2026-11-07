-- Users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text,
  first_name text not null,
  last_name text,
  avatar_url text,
  coins bigint not null default 0,
  total_taps bigint not null default 0,
  current_skin text not null default 'default',
  referrer_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Owned skins
create table if not exists public.user_skins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  skin_id text not null,
  purchased_at timestamptz not null default now(),
  unique(user_id, skin_id)
);

-- Indexes
create index if not exists users_telegram_id_idx on public.users(telegram_id);
create index if not exists user_skins_user_id_idx on public.user_skins(user_id);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

-- RLS
alter table public.users enable row level security;
alter table public.user_skins enable row level security;

-- Для Telegram Mini App обычно используем service_role в Edge Functions.
-- Публичные политики можно настроить под свою auth-схему.
create policy "Users are viewable by everyone"
  on public.users for select
  using (true);

create policy "Users can update own row"
  on public.users for update
  using (true);

create policy "Users can insert"
  on public.users for insert
  with check (true);

create policy "Skins are viewable"
  on public.user_skins for select
  using (true);

create policy "Skins can be inserted"
  on public.user_skins for insert
  with check (true);
