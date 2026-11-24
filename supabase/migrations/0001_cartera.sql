-- Cartera en la nube (cuentas de usuario). Misma forma que la cartera local (IndexedDB): activos, movimientos y ajustes.
-- Cada fila es de un usuario y solo ese usuario la puede leer o tocar: lo controla la base (Row Level Security),
-- no la web. Los montos van como texto dentro de `datos` (decimales exactos, igual que en el navegador).

create table if not exists public.cartera_activos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  datos jsonb not null,
  actualizado timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.cartera_movimientos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  activo_id text not null,
  datos jsonb not null,
  actualizado timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists cartera_movimientos_activo on public.cartera_movimientos (user_id, activo_id);

create table if not exists public.cartera_ajustes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null,
  actualizado timestamptz not null default now()
);

alter table public.cartera_activos enable row level security;
alter table public.cartera_movimientos enable row level security;
alter table public.cartera_ajustes enable row level security;

-- Solo usuarios con sesión, y cada uno con lo suyo. Los visitantes sin sesión (anon) no ven nada.
revoke all on public.cartera_activos, public.cartera_movimientos, public.cartera_ajustes from anon;
grant select, insert, update, delete on public.cartera_activos, public.cartera_movimientos, public.cartera_ajustes to authenticated;

drop policy if exists "cada uno lo suyo" on public.cartera_activos;
create policy "cada uno lo suyo" on public.cartera_activos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "cada uno lo suyo" on public.cartera_movimientos;
create policy "cada uno lo suyo" on public.cartera_movimientos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "cada uno lo suyo" on public.cartera_ajustes;
create policy "cada uno lo suyo" on public.cartera_ajustes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Reemplazar toda la cartera de una vez (importar un archivo): todo o nada.
create or replace function public.reemplazar_cartera(activos jsonb, movimientos jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.cartera_movimientos where user_id = auth.uid();
  delete from public.cartera_activos where user_id = auth.uid();
  insert into public.cartera_activos (user_id, id, datos)
    select auth.uid(), a->>'id', a from jsonb_array_elements(activos) a;
  insert into public.cartera_movimientos (user_id, id, activo_id, datos)
    select auth.uid(), m->>'id', m->>'activoId', m from jsonb_array_elements(movimientos) m;
end;
$$;
revoke all on function public.reemplazar_cartera(jsonb, jsonb) from public, anon;
grant execute on function public.reemplazar_cartera(jsonb, jsonb) to authenticated;
