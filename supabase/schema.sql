-- Медовый Дом: Supabase schema
-- Выполнить целиком в Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text,
  first_name text,
  last_name text,
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  telegram_id bigint,
  user_id uuid references public.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  method text not null default 'Самовывоз',
  address text,
  pickup_date text,
  comment text,
  total numeric(12,2) not null default 0,
  status text not null default 'new',
  telegram_sent boolean not null default false,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_name text not null,
  price numeric(12,2) not null default 0,
  quantity integer not null check (quantity > 0),
  subtotal numeric(12,2) not null default 0
);

create index if not exists orders_telegram_id_idx
  on public.orders(telegram_id);

create index if not exists orders_created_at_idx
  on public.orders(created_at desc);

create index if not exists orders_status_idx
  on public.orders(status);

create index if not exists order_items_order_id_idx
  on public.order_items(order_id);

-- RLS: браузер не должен напрямую читать/изменять заказы.
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Никаких public INSERT/UPDATE/SELECT policy не создаём.
-- Edge Function использует service_role и работает серверно.

-- Необязательно, но удобно для будущей админки:
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();
