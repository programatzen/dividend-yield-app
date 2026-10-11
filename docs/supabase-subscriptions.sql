-- Ejecutar en el SQL editor de Supabase (fase 3: planes).
-- Solo lectura para el dueño; escritura vía service_role / Edge Functions (fase 4).

create table if not exists subscriptions (
  user_id uuid primary key references auth.users (id),
  plan text not null default 'gratis',
  status text not null default 'active',
  mp_preapproval_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

drop policy if exists "own subscription read" on subscriptions;
create policy "own subscription read" on subscriptions
  for select using (auth.uid() = user_id);

-- Sin políticas de insert/update/delete: el cliente no puede auto-asignarse planes.
-- (La app valida límites solo en UI, según lo acordado.)

-- Plan máximo para la cuenta base:
insert into subscriptions (user_id, plan, status)
select id, 'pro', 'active' from auth.users where email = 'programatzen@gmail.com'
on conflict (user_id) do update set plan = 'pro', status = 'active', updated_at = now();
