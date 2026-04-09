-- Bootstrap migration for empty/partially-initialized Supabase projects.
-- Goal: eliminate PostgREST 404 for core ERP resources by ensuring
-- foundational tables/relations exist.
--
-- This migration is intentionally idempotent and safe to run multiple times.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------
-- Core authz model used by policies in other migrations
-- -----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'gestor', 'operacional', 'viewer');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key,
  nome text,
  email text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
  );
$$;

-- -----------------------------------------------------------------
-- Configurações
-- -----------------------------------------------------------------
create table if not exists public.app_configuracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

-- -----------------------------------------------------------------
-- Segurança adicional (complementa migrations existentes)
-- -----------------------------------------------------------------
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  ativo boolean not null default true,
  origem text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

-- -----------------------------------------------------------------
-- Cadastros
-- -----------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome_razao_social text not null,
  cpf_cnpj text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome_razao_social text not null,
  cpf_cnpj text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_interno text,
  unidade_medida text,
  estoque_atual numeric not null default 0,
  estoque_minimo numeric,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- Comercial
-- -----------------------------------------------------------------
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text,
  cliente_id uuid references public.clientes(id),
  status text,
  data_orcamento date,
  valor_total numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ordens_venda (
  id uuid primary key default gen_random_uuid(),
  numero text,
  cliente_id uuid references public.clientes(id),
  valor_total numeric not null default 0,
  data_emissao date,
  data_prometida_despacho date,
  prazo_despacho_dias integer,
  status text,
  status_faturamento text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- Compras
-- -----------------------------------------------------------------
create table if not exists public.pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  numero text,
  fornecedor_id uuid references public.fornecedores(id),
  valor_total numeric not null default 0,
  status text,
  data_pedido date,
  data_entrega_prevista date,
  data_entrega_real date,
  frete_valor numeric not null default 0,
  condicao_pagamento text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- Fiscal
-- -----------------------------------------------------------------
create table if not exists public.notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  status text,
  valor_total numeric not null default 0,
  data_emissao date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- Financeiro
-- -----------------------------------------------------------------
create table if not exists public.financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  status text,
  valor numeric not null default 0,
  data_vencimento date,
  data_pagamento date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- RLS defaults (read authenticated, write admin)
-- -----------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'user_roles',
    'user_permissions',
    'app_configuracoes',
    'clientes',
    'fornecedores',
    'produtos',
    'orcamentos',
    'ordens_venda',
    'pedidos_compra',
    'notas_fiscais',
    'financeiro_lancamentos'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_read_authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read_authenticated', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_admin_manage', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(auth.uid(), ''admin''::public.app_role)) with check (public.has_role(auth.uid(), ''admin''::public.app_role))',
      t || '_admin_manage', t
    );
  end loop;
end $$;

select pg_notify('pgrst', 'reload schema');
notify pgrst, 'reload schema';
