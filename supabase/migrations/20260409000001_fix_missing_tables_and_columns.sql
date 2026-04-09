-- Consolidation migration: ensures all tables and columns that the
-- application code references actually exist in the database, so that
-- the REST API no longer returns 404/400 errors.
--
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS guards).

-- ──────────────────────────────────────────────
-- 1. permissions catalogue table
-- ──────────────────────────────────────────────
create table if not exists public.permissions (
  id             uuid        primary key default gen_random_uuid(),
  resource       text        not null,
  action         text        not null,
  permission_key text        generated always as (resource || ':' || action) stored,
  descricao      text,
  ativo          boolean     not null default true,
  created_at     timestamptz not null default now(),
  unique(resource, action),
  unique(permission_key)
);

alter table public.permissions enable row level security;

drop policy if exists "permissions_select" on public.permissions;
create policy "permissions_select"
  on public.permissions for select to authenticated
  using (true);

drop policy if exists "permissions_admin_manage" on public.permissions;
create policy "permissions_admin_manage"
  on public.permissions for all to authenticated
  using  (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- ──────────────────────────────────────────────
-- 2. role_permissions mapping table
-- ──────────────────────────────────────────────
create table if not exists public.role_permissions (
  id             uuid        primary key default gen_random_uuid(),
  role           app_role    not null,
  permission_key text        not null,
  created_at     timestamptz not null default now(),
  created_by     uuid        null,
  unique(role, permission_key)
);

alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions_select" on public.role_permissions;
create policy "role_permissions_select"
  on public.role_permissions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "role_permissions_admin_manage" on public.role_permissions;
create policy "role_permissions_admin_manage"
  on public.role_permissions for all to authenticated
  using  (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- ──────────────────────────────────────────────
-- 3. user_permissions – per-user overrides
-- ──────────────────────────────────────────────
create table if not exists public.user_permissions (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  permission_key text        not null,
  ativo          boolean     not null default true,
  origem         text        not null default 'manual',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid        null,
  updated_by     uuid        null,
  unique(user_id, permission_key)
);

alter table public.user_permissions enable row level security;

drop policy if exists "user_permissions_select" on public.user_permissions;
create policy "user_permissions_select"
  on public.user_permissions for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "user_permissions_admin_manage" on public.user_permissions;
create policy "user_permissions_admin_manage"
  on public.user_permissions for all to authenticated
  using  (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- ──────────────────────────────────────────────
-- 4. permission_audit log
-- ──────────────────────────────────────────────
create table if not exists public.permission_audit (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        null,
  target_user_id  uuid        null,
  role_padrao     app_role    null,
  alteracao       jsonb       not null,
  created_at      timestamptz not null default now()
);

alter table public.permission_audit enable row level security;

drop policy if exists "permission_audit_admin" on public.permission_audit;
create policy "permission_audit_admin"
  on public.permission_audit for all to authenticated
  using  (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- ──────────────────────────────────────────────
-- 5. pedidos_compra – extended columns
-- ──────────────────────────────────────────────
alter table public.pedidos_compra
  add column if not exists data_entrega_real  date,
  add column if not exists frete_valor        numeric default 0,
  add column if not exists condicao_pagamento text;

-- ──────────────────────────────────────────────
-- 6. Refresh PostgREST schema cache
-- ──────────────────────────────────────────────
select pg_notify('pgrst', 'reload schema');
notify pgrst, 'reload schema';
