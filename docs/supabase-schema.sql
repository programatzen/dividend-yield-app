-- Ejecutar en el SQL editor de Supabase (fase 1: guardado por usuario).
-- Requiere Auth con Google activado.

create table if not exists portfolios (
  id uuid primary key,
  user_id uuid not null references auth.users (id),
  name text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);
create index if not exists portfolios_user_idx on portfolios (user_id);

create table if not exists holdings (
  id uuid primary key,
  portfolio_id uuid not null references portfolios (id) on delete cascade,
  ticker text not null,
  name text not null,
  kind text not null check (kind in ('accion', 'etf')),
  shares numeric not null,
  annual_dividend numeric not null,
  payout_months int[] not null default '{}'
);
create index if not exists holdings_portfolio_idx on holdings (portfolio_id);

alter table portfolios enable row level security;
alter table holdings enable row level security;

drop policy if exists "own portfolios" on portfolios;
create policy "own portfolios" on portfolios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own holdings" on holdings;
create policy "own holdings" on holdings
  for all using (
    exists (select 1 from portfolios p where p.id = holdings.portfolio_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from portfolios p where p.id = holdings.portfolio_id and p.user_id = auth.uid())
  );
