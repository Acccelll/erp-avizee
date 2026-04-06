-- Estrutura de permissões granulares para administração
alter type public.tipo_movimento_estoque add value if not exists 'transferencia';
alter type public.tipo_movimento_estoque add value if not exists 'reserva';
alter type public.tipo_movimento_estoque add value if not exists 'liberacao_reserva';
alter type public.tipo_movimento_estoque add value if not exists 'estorno';
alter type public.tipo_movimento_estoque add value if not exists 'inventario';
alter type public.tipo_movimento_estoque add value if not exists 'perda_avaria';

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  permission_key text generated always as (resource || ':' || action) stored,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique(resource, action),
  unique(permission_key)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role app_role not null,
  permission_key text not null,
  created_at timestamptz not null default now(),
  created_by uuid null,
  unique(role, permission_key)
);

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  ativo boolean not null default true,
  origem text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null,
  unique(user_id, permission_key)
);

create table if not exists public.permission_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  target_user_id uuid null,
  role_padrao app_role null,
  alteracao jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role_padrao app_role;

update public.profiles p
set role_padrao = sub.role
from (
  select distinct on (user_id) user_id, role
  from public.user_roles
  order by user_id, created_at asc
) sub
where p.id = sub.user_id
  and p.role_padrao is null;

update public.profiles
set role_padrao = 'vendedor'::app_role
where role_padrao is null;

alter table public.profiles alter column role_padrao set not null;
alter table public.profiles alter column role_padrao set default 'vendedor'::app_role;

insert into public.permissions(resource, action, descricao)
values
('dashboard','visualizar','Visualizar dashboard'),
('produtos','visualizar','Visualizar produtos'), ('produtos','editar','Editar produtos'),
('clientes','visualizar','Visualizar clientes'), ('clientes','editar','Editar clientes'),
('fornecedores','visualizar','Visualizar fornecedores'), ('fornecedores','editar','Editar fornecedores'),
('transportadoras','visualizar','Visualizar transportadoras'), ('transportadoras','editar','Editar transportadoras'),
('formas_pagamento','visualizar','Visualizar formas de pagamento'), ('formas_pagamento','editar','Editar formas de pagamento'),
('orcamentos','visualizar','Visualizar orçamentos'), ('orcamentos','editar','Editar orçamentos'),
('pedidos','visualizar','Visualizar pedidos'), ('pedidos','editar','Editar pedidos'),
('compras','visualizar','Visualizar compras'), ('compras','editar','Editar compras'),
('estoque','visualizar','Visualizar estoque'), ('estoque','editar','Editar estoque'),
('logistica','visualizar','Visualizar logística'), ('logistica','editar','Editar logística'),
('financeiro','visualizar','Visualizar financeiro'), ('financeiro','editar','Editar financeiro'),
('faturamento_fiscal','visualizar','Visualizar fiscal'), ('faturamento_fiscal','editar','Editar fiscal'),
('relatorios','visualizar','Visualizar relatórios'),
('usuarios','visualizar','Visualizar usuários'), ('usuarios','editar','Editar usuários'),
('administracao','visualizar','Visualizar administração'), ('administracao','editar','Editar administração')
on conflict do nothing;

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permissions enable row level security;
alter table public.permission_audit enable row level security;

drop policy if exists "permissions_select" on public.permissions;
create policy "permissions_select"
on public.permissions for select to authenticated
using (true);

drop policy if exists "permissions_admin_manage" on public.permissions;
create policy "permissions_admin_manage"
on public.permissions for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "role_permissions_select" on public.role_permissions;
create policy "role_permissions_select"
on public.role_permissions for select to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "role_permissions_admin_manage" on public.role_permissions;
create policy "role_permissions_admin_manage"
on public.role_permissions for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "user_permissions_select" on public.user_permissions;
create policy "user_permissions_select"
on public.user_permissions for select to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "user_permissions_admin_manage" on public.user_permissions;
create policy "user_permissions_admin_manage"
on public.user_permissions for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "permission_audit_admin" on public.permission_audit;
create policy "permission_audit_admin"
on public.permission_audit for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));
