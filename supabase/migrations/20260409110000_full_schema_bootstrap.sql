-- ============================================================
-- Full-schema bootstrap migration (idempotent)
-- ============================================================
-- Ensures every table, column, type, function, trigger and RLS
-- policy needed by the application exists in the database.
-- All statements use IF NOT EXISTS / CREATE OR REPLACE /
-- DROP … IF EXISTS guards so this migration is safe to run
-- against a database that already has some (or all) objects.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 0. Helper: update_updated_at trigger function
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 1. Enum types
-- ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.tipo_pessoa          AS ENUM ('F', 'J');                                                       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tipo_endereco        AS ENUM ('comercial', 'entrega', 'cobranca');                             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tipo_movimento_estoque AS ENUM ('entrada', 'saida', 'ajuste');                                 EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tipo_nota_fiscal     AS ENUM ('entrada', 'saida');                                             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.status_nota_fiscal   AS ENUM ('pendente', 'confirmada', 'cancelada');                          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tipo_financeiro      AS ENUM ('pagar', 'receber');                                             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.status_financeiro    AS ENUM ('aberto', 'pago', 'vencido', 'cancelado');                       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tipo_caixa           AS ENUM ('abertura', 'suprimento', 'sangria', 'fechamento', 'venda', 'pagamento'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.status_pedido        AS ENUM ('rascunho', 'confirmado', 'cancelado', 'faturado');              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.app_role             AS ENUM ('admin', 'vendedor', 'financeiro', 'estoquista');                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.status_ordem_venda   AS ENUM ('pendente', 'aprovada', 'em_separacao', 'cancelada');            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.status_faturamento   AS ENUM ('aguardando', 'parcial', 'total');                               EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extra enum values added in later migrations
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'aprovado';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'convertido';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'pendente';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'aguardando_aprovacao';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'em_analise';

-- ──────────────────────────────────────────────────────────
-- 2. Core security function (needed by RLS policies below)
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ──────────────────────────────────────────────────────────
-- 3. profiles
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       text        NOT NULL DEFAULT '',
  email      text,
  cargo      text,
  avatar_url text,
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ──────────────────────────────────────────────────────────
-- 4. user_roles
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    app_role  NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles"  ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles"  ON public.user_roles FOR ALL    TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: create profile + assign role on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- 5. grupos_produto
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grupos_produto (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text        NOT NULL UNIQUE,
  descricao  text,
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grupos_produto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read grupos"   ON public.grupos_produto;
DROP POLICY IF EXISTS "Authenticated users can insert grupos" ON public.grupos_produto;
DROP POLICY IF EXISTS "Authenticated users can update grupos" ON public.grupos_produto;
DROP POLICY IF EXISTS "Authenticated users can delete grupos" ON public.grupos_produto;
CREATE POLICY "Authenticated users can read grupos"   ON public.grupos_produto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert grupos" ON public.grupos_produto FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update grupos" ON public.grupos_produto FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete grupos" ON public.grupos_produto FOR DELETE TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_grupos_produto_updated_at ON public.grupos_produto;
CREATE TRIGGER update_grupos_produto_updated_at BEFORE UPDATE ON public.grupos_produto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ──────────────────────────────────────────────────────────
-- 6. produtos
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.produtos (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              text           UNIQUE,
  codigo_interno   text           UNIQUE,
  nome             text           NOT NULL,
  descricao        text,
  grupo_id         uuid           REFERENCES public.grupos_produto(id),
  unidade_medida   text           NOT NULL DEFAULT 'UN',
  preco_custo      numeric(10,2)  DEFAULT 0,
  preco_venda      numeric(10,2)  NOT NULL DEFAULT 0,
  estoque_atual    numeric(10,2)  DEFAULT 0,
  estoque_minimo   numeric(10,2)  DEFAULT 0,
  peso             numeric(10,3),
  ncm              text,
  cst              text,
  cfop_padrao      text,
  ativo            boolean        NOT NULL DEFAULT true,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD produtos" ON public.produtos;
CREATE POLICY "Auth users can CRUD produtos" ON public.produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_produtos_updated_at ON public.produtos;
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Extra columns added in later migrations
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS eh_composto       boolean      DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_composto    numeric(10,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS markup_percentual numeric(10,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_sugerido    numeric(10,2) DEFAULT 0;

-- ──────────────────────────────────────────────────────────
-- 7. clientes
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa         tipo_pessoa   NOT NULL DEFAULT 'F',
  nome_razao_social   text          NOT NULL,
  nome_fantasia       text,
  cpf_cnpj            text          UNIQUE,
  inscricao_estadual  text,
  inscricao_municipal text,
  email               text,
  telefone            text,
  celular             text,
  prazo_padrao        integer       DEFAULT 30,
  limite_credito      numeric(10,2) DEFAULT 0,
  observacoes         text,
  logradouro          text,
  numero              text,
  complemento         text,
  bairro              text,
  cidade              text,
  uf                  text,
  cep                 text,
  ativo               boolean       NOT NULL DEFAULT true,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD clientes" ON public.clientes;
CREATE POLICY "Auth users can CRUD clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS contato                  text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS pais                     text DEFAULT 'Brasil';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS forma_pagamento_padrao   text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS prazo_preferencial       integer;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS grupo_economico_id       uuid;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_relacao_grupo       text DEFAULT 'independente';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS caixa_postal             text;

-- ──────────────────────────────────────────────────────────
-- 8. fornecedores
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa        tipo_pessoa   NOT NULL DEFAULT 'J',
  nome_razao_social  text          NOT NULL,
  nome_fantasia      text,
  cpf_cnpj           text          UNIQUE,
  inscricao_estadual text,
  email              text,
  telefone           text,
  celular            text,
  prazo_padrao       integer       DEFAULT 30,
  observacoes        text,
  logradouro         text,
  numero             text,
  complemento        text,
  bairro             text,
  cidade             text,
  uf                 text,
  cep                text,
  ativo              boolean       NOT NULL DEFAULT true,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD fornecedores" ON public.fornecedores;
CREATE POLICY "Auth users can CRUD fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_fornecedores_updated_at ON public.fornecedores;
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS contato text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS pais    text DEFAULT 'Brasil';

-- ──────────────────────────────────────────────────────────
-- 9. grupos_economicos  (depends on clientes)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grupos_economicos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              text        NOT NULL,
  empresa_matriz_id uuid        REFERENCES public.clientes(id) ON DELETE SET NULL,
  observacoes       text,
  ativo             boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grupos_economicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD grupos_economicos" ON public.grupos_economicos;
CREATE POLICY "Auth users can CRUD grupos_economicos" ON public.grupos_economicos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_grupos_economicos_updated_at ON public.grupos_economicos;
CREATE TRIGGER update_grupos_economicos_updated_at BEFORE UPDATE ON public.grupos_economicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Back-fill FK on clientes now that grupos_economicos exists
DO $$ BEGIN
  ALTER TABLE public.clientes
    ADD CONSTRAINT clientes_grupo_economico_id_fkey
    FOREIGN KEY (grupo_economico_id) REFERENCES public.grupos_economicos(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- 10. bancos + contas_bancarias
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bancos (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text        NOT NULL,
  tipo       text        NOT NULL DEFAULT 'banco',
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD bancos" ON public.bancos;
CREATE POLICY "Auth users can CRUD bancos" ON public.bancos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_bancos_updated_at ON public.bancos;
CREATE TRIGGER update_bancos_updated_at BEFORE UPDATE ON public.bancos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id    uuid        NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
  descricao   text        NOT NULL,
  agencia     text,
  conta       text,
  titular     text,
  saldo_atual numeric     DEFAULT 0,
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD contas_bancarias" ON public.contas_bancarias;
CREATE POLICY "Auth users can CRUD contas_bancarias" ON public.contas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_contas_bancarias_updated_at ON public.contas_bancarias;
CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ──────────────────────────────────────────────────────────
-- 11. contas_contabeis
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contas_contabeis (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            text        NOT NULL,
  descricao         text        NOT NULL,
  natureza          text        NOT NULL DEFAULT 'devedora',
  aceita_lancamento boolean     NOT NULL DEFAULT true,
  conta_pai_id      uuid        REFERENCES public.contas_contabeis(id),
  ativo             boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_contabeis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD contas_contabeis" ON public.contas_contabeis;
CREATE POLICY "Auth users can CRUD contas_contabeis" ON public.contas_contabeis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 12. transportadoras
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transportadoras (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_razao_social text        NOT NULL,
  nome_fantasia     text,
  cpf_cnpj          text,
  contato           text,
  telefone          text,
  email             text,
  logradouro        text,
  numero            text,
  complemento       text,
  bairro            text,
  cidade            text,
  uf                text,
  cep               text,
  modalidade        text        DEFAULT 'rodoviario',
  prazo_medio       text,
  observacoes       text,
  ativo             boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD transportadoras" ON public.transportadoras;
CREATE POLICY "Auth users can CRUD transportadoras" ON public.transportadoras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 13. empresa_config
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.empresa_config (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social     text        NOT NULL DEFAULT 'AVIZEE EQUIPAMENTOS LTDA',
  nome_fantasia    text        NOT NULL DEFAULT 'AVIZEE',
  cnpj             text        DEFAULT '53.078.538/0001-85',
  inscricao_estadual text,
  telefone         text        DEFAULT '(19) 99898-2930',
  email            text,
  logradouro       text        DEFAULT 'RUA ADA CAROLINE SCARANO, 259',
  bairro           text        DEFAULT 'JOAO ARANHA',
  cidade           text        DEFAULT 'PAULÍNIA',
  uf               text        DEFAULT 'SP',
  cep              text        DEFAULT '13145-794',
  logo_url         text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read empresa_config" ON public.empresa_config;
DROP POLICY IF EXISTS "Admins can manage empresa_config"            ON public.empresa_config;
CREATE POLICY "Authenticated users can read empresa_config" ON public.empresa_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage empresa_config"            ON public.empresa_config FOR ALL    TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ──────────────────────────────────────────────────────────
-- 14. app_configuracoes
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_configuracoes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave      text        NOT NULL UNIQUE,
  valor      jsonb       DEFAULT '{}'::jsonb,
  descricao  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_configuracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage app_configuracoes"     ON public.app_configuracoes;
DROP POLICY IF EXISTS "Auth users can read app_configuracoes"   ON public.app_configuracoes;
CREATE POLICY "Admins can manage app_configuracoes"   ON public.app_configuracoes FOR ALL    TO authenticated USING  (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth users can read app_configuracoes" ON public.app_configuracoes FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_app_configuracoes_updated_at ON public.app_configuracoes;
CREATE TRIGGER update_app_configuracoes_updated_at BEFORE UPDATE ON public.app_configuracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ──────────────────────────────────────────────────────────
-- 15. cotacoes_compra (purchase quote header)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cotacoes_compra (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero       text        NOT NULL,
  data_cotacao date        NOT NULL DEFAULT CURRENT_DATE,
  data_validade date,
  status       text        NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_analise','finalizada','cancelada')),
  observacoes  text,
  usuario_id   uuid,
  ativo        boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cotacoes_compra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can read cotacoes_compra"            ON public.cotacoes_compra;
DROP POLICY IF EXISTS "Admin/financeiro can insert cotacoes_compra"    ON public.cotacoes_compra;
DROP POLICY IF EXISTS "Admin/financeiro can update cotacoes_compra"    ON public.cotacoes_compra;
DROP POLICY IF EXISTS "Admin/financeiro can delete cotacoes_compra"    ON public.cotacoes_compra;
CREATE POLICY "Auth users can read cotacoes_compra"            ON public.cotacoes_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert cotacoes_compra"    ON public.cotacoes_compra FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin/financeiro can update cotacoes_compra"    ON public.cotacoes_compra FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin/financeiro can delete cotacoes_compra"    ON public.cotacoes_compra FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
DROP TRIGGER IF EXISTS update_cotacoes_compra_updated_at ON public.cotacoes_compra;
CREATE TRIGGER update_cotacoes_compra_updated_at BEFORE UPDATE ON public.cotacoes_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.cotacoes_compra_itens (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_compra_id uuid    NOT NULL REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE,
  produto_id        uuid    NOT NULL REFERENCES public.produtos(id),
  quantidade        numeric NOT NULL DEFAULT 1,
  unidade           text    DEFAULT 'UN',
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cotacoes_compra_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can read cotacoes_compra_itens"         ON public.cotacoes_compra_itens;
DROP POLICY IF EXISTS "Admin/financeiro can insert cotacoes_compra_itens" ON public.cotacoes_compra_itens;
DROP POLICY IF EXISTS "Admin/financeiro can update cotacoes_compra_itens" ON public.cotacoes_compra_itens;
DROP POLICY IF EXISTS "Admin/financeiro can delete cotacoes_compra_itens" ON public.cotacoes_compra_itens;
CREATE POLICY "Auth users can read cotacoes_compra_itens"         ON public.cotacoes_compra_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert cotacoes_compra_itens" ON public.cotacoes_compra_itens FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin/financeiro can update cotacoes_compra_itens" ON public.cotacoes_compra_itens FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin/financeiro can delete cotacoes_compra_itens" ON public.cotacoes_compra_itens FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));

CREATE TABLE IF NOT EXISTS public.cotacoes_compra_propostas (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_compra_id uuid    NOT NULL REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE,
  item_id           uuid    NOT NULL REFERENCES public.cotacoes_compra_itens(id) ON DELETE CASCADE,
  fornecedor_id     uuid    NOT NULL REFERENCES public.fornecedores(id),
  preco_unitario    numeric NOT NULL DEFAULT 0,
  prazo_entrega_dias integer,
  observacoes       text,
  selecionado       boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cotacoes_compra_propostas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can read cotacoes_compra_propostas"         ON public.cotacoes_compra_propostas;
DROP POLICY IF EXISTS "Admin/financeiro can insert cotacoes_compra_propostas" ON public.cotacoes_compra_propostas;
DROP POLICY IF EXISTS "Admin/financeiro can update cotacoes_compra_propostas" ON public.cotacoes_compra_propostas;
DROP POLICY IF EXISTS "Admin/financeiro can delete cotacoes_compra_propostas" ON public.cotacoes_compra_propostas;
CREATE POLICY "Auth users can read cotacoes_compra_propostas"         ON public.cotacoes_compra_propostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert cotacoes_compra_propostas" ON public.cotacoes_compra_propostas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin/financeiro can update cotacoes_compra_propostas" ON public.cotacoes_compra_propostas FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Admin/financeiro can delete cotacoes_compra_propostas" ON public.cotacoes_compra_propostas FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));

-- ──────────────────────────────────────────────────────────
-- 16. funcionarios
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text          NOT NULL,
  cpf             text,
  cargo           text,
  departamento    text,
  data_admissao   date          NOT NULL DEFAULT CURRENT_DATE,
  data_demissao   date,
  salario_base    numeric(12,2) NOT NULL DEFAULT 0,
  tipo_contrato   text          NOT NULL DEFAULT 'clt',
  observacoes     text,
  ativo           boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage funcionarios"   ON public.funcionarios;
DROP POLICY IF EXISTS "Auth users can read funcionarios" ON public.funcionarios;
CREATE POLICY "Admin can manage funcionarios"    ON public.funcionarios FOR ALL    TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Auth users can read funcionarios" ON public.funcionarios FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────
-- 17. importacao_lotes (needed by financeiro_lancamentos FK)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.importacao_lotes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              text        NOT NULL,
  status            text        NOT NULL DEFAULT 'pendente',
  total_registros   integer     DEFAULT 0,
  total_sucesso     integer     DEFAULT 0,
  total_erros       integer     DEFAULT 0,
  mapeamento_colunas jsonb      DEFAULT '{}'::jsonb,
  data_base         date,
  usuario_id        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.importacao_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD importacao_lotes" ON public.importacao_lotes;
CREATE POLICY "Auth users can CRUD importacao_lotes" ON public.importacao_lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 18. orcamentos
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           text        NOT NULL UNIQUE,
  cliente_id       uuid        REFERENCES public.clientes(id),
  data_orcamento   date        NOT NULL DEFAULT CURRENT_DATE,
  validade         date,
  valor_total      numeric(10,2) DEFAULT 0,
  observacoes      text,
  status           text        NOT NULL DEFAULT 'pendente',
  usuario_id       uuid        REFERENCES auth.users(id),
  ativo            boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD orcamentos" ON public.orcamentos;
CREATE POLICY "Auth users can CRUD orcamentos" ON public.orcamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_orcamentos_updated_at ON public.orcamentos;
CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS desconto          numeric     DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete_tipo        text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete_valor       numeric     DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS outras_despesas   numeric     DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS imposto_ipi       numeric     DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS imposto_st        numeric     DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS peso_total        numeric     DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS quantidade_total  numeric     DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS prazo_entrega     text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS prazo_pagamento   text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS pagamento         text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS modalidade        text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS vendedor_id       uuid;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS cliente_snapshot  jsonb;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS public_token      text        UNIQUE;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS observacoes_internas text;

CREATE TABLE IF NOT EXISTS public.orcamentos_itens (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id     uuid    NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  produto_id       uuid    NOT NULL REFERENCES public.produtos(id),
  quantidade       numeric NOT NULL,
  valor_unitario   numeric NOT NULL,
  valor_total      numeric NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamentos_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD orcamentos_itens" ON public.orcamentos_itens;
CREATE POLICY "Auth users can CRUD orcamentos_itens" ON public.orcamentos_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS codigo_snapshot    text;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS descricao_snapshot text;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS unidade            text    DEFAULT 'UN';
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS variacao           text;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS peso_unitario      numeric DEFAULT 0;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS peso_total         numeric DEFAULT 0;

-- ──────────────────────────────────────────────────────────
-- 19. ordens_venda
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ordens_venda (
  id                       uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                   text                NOT NULL,
  data_emissao             date                NOT NULL DEFAULT CURRENT_DATE,
  cliente_id               uuid                REFERENCES public.clientes(id),
  cotacao_id               uuid                REFERENCES public.orcamentos(id),
  status                   status_ordem_venda  NOT NULL DEFAULT 'pendente',
  status_faturamento       status_faturamento  NOT NULL DEFAULT 'aguardando',
  data_aprovacao           date,
  data_prometida_despacho  date,
  prazo_despacho_dias      integer,
  valor_total              numeric             DEFAULT 0,
  observacoes              text,
  usuario_id               uuid,
  vendedor_id              uuid,
  ativo                    boolean             NOT NULL DEFAULT true,
  created_at               timestamptz         NOT NULL DEFAULT now(),
  updated_at               timestamptz         NOT NULL DEFAULT now()
);
ALTER TABLE public.ordens_venda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD ordens_venda" ON public.ordens_venda;
CREATE POLICY "Auth users can CRUD ordens_venda" ON public.ordens_venda FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_ordens_venda_updated_at ON public.ordens_venda;
CREATE TRIGGER update_ordens_venda_updated_at BEFORE UPDATE ON public.ordens_venda FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.ordens_venda ADD COLUMN IF NOT EXISTS data_po_cliente date;
ALTER TABLE public.ordens_venda ADD COLUMN IF NOT EXISTS po_number       text;

CREATE TABLE IF NOT EXISTS public.ordens_venda_itens (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_venda_id       uuid    NOT NULL REFERENCES public.ordens_venda(id) ON DELETE CASCADE,
  produto_id           uuid    NOT NULL REFERENCES public.produtos(id),
  codigo_snapshot      text,
  descricao_snapshot   text,
  variacao             text,
  quantidade           numeric NOT NULL,
  unidade              text    DEFAULT 'UN',
  valor_unitario       numeric NOT NULL,
  valor_total          numeric NOT NULL,
  peso_unitario        numeric DEFAULT 0,
  peso_total           numeric DEFAULT 0,
  quantidade_faturada  numeric DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ordens_venda_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD ordens_venda_itens" ON public.ordens_venda_itens;
CREATE POLICY "Auth users can CRUD ordens_venda_itens" ON public.ordens_venda_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 20. notas_fiscais
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id                  uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                tipo_nota_fiscal   NOT NULL,
  numero              text               NOT NULL,
  serie               text,
  chave_acesso        text               UNIQUE,
  data_emissao        date               NOT NULL DEFAULT CURRENT_DATE,
  data_recebimento    date,
  fornecedor_id       uuid               REFERENCES public.fornecedores(id),
  cliente_id          uuid               REFERENCES public.clientes(id),
  valor_total         numeric(10,2)      NOT NULL DEFAULT 0,
  status              status_nota_fiscal NOT NULL DEFAULT 'pendente',
  movimenta_estoque   boolean            DEFAULT true,
  gera_financeiro     boolean            DEFAULT true,
  observacoes         text,
  usuario_id          uuid               REFERENCES auth.users(id),
  ativo               boolean            NOT NULL DEFAULT true,
  created_at          timestamptz        NOT NULL DEFAULT now(),
  updated_at          timestamptz        NOT NULL DEFAULT now()
);
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD notas_fiscais" ON public.notas_fiscais;
CREATE POLICY "Auth users can CRUD notas_fiscais" ON public.notas_fiscais FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_notas_fiscais_updated_at ON public.notas_fiscais;
CREATE TRIGGER update_notas_fiscais_updated_at BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS ordem_venda_id      uuid    REFERENCES public.ordens_venda(id);
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS frete_valor         numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS icms_valor          numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS icms_st_valor       numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS ipi_valor           numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS pis_valor           numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS cofins_valor        numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS desconto_valor      numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS outras_despesas     numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS condicao_pagamento  text    DEFAULT 'a_vista';
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS forma_pagamento     text;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS origem              text    DEFAULT 'operacional';
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS somente_consulta    boolean DEFAULT false;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS conta_contabil_id   uuid    REFERENCES public.contas_contabeis(id);
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS modelo_documento    text;

CREATE TABLE IF NOT EXISTS public.notas_fiscais_itens (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id  uuid    NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  produto_id      uuid    NOT NULL REFERENCES public.produtos(id),
  quantidade      numeric NOT NULL,
  valor_unitario  numeric NOT NULL,
  cfop            text,
  cst             text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notas_fiscais_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD notas_fiscais_itens" ON public.notas_fiscais_itens;
CREATE POLICY "Auth users can CRUD notas_fiscais_itens" ON public.notas_fiscais_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS icms_valor         numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS ipi_valor          numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS pis_valor          numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS cofins_valor       numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS conta_contabil_id  uuid    REFERENCES public.contas_contabeis(id);

-- ──────────────────────────────────────────────────────────
-- 21. financeiro_lancamentos
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financeiro_lancamentos (
  id               uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             tipo_financeiro  NOT NULL,
  descricao        text             NOT NULL,
  valor            numeric(10,2)    NOT NULL,
  data_vencimento  date             NOT NULL,
  data_pagamento   date,
  nota_fiscal_id   uuid             REFERENCES public.notas_fiscais(id),
  cliente_id       uuid             REFERENCES public.clientes(id),
  fornecedor_id    uuid             REFERENCES public.fornecedores(id),
  status           status_financeiro NOT NULL DEFAULT 'aberto',
  observacoes      text,
  usuario_id       uuid             REFERENCES auth.users(id),
  ativo            boolean          NOT NULL DEFAULT true,
  created_at       timestamptz      NOT NULL DEFAULT now(),
  updated_at       timestamptz      NOT NULL DEFAULT now()
);
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD financeiro_lancamentos" ON public.financeiro_lancamentos;
CREATE POLICY "Auth users can CRUD financeiro_lancamentos" ON public.financeiro_lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_financeiro_updated_at ON public.financeiro_lancamentos;
CREATE TRIGGER update_financeiro_updated_at BEFORE UPDATE ON public.financeiro_lancamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS saldo_restante       numeric;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcela_numero       integer;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcela_total        integer;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS documento_fiscal_id  uuid REFERENCES public.notas_fiscais(id);
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS conta_bancaria_id    uuid REFERENCES public.contas_bancarias(id);
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS conta_contabil_id    uuid REFERENCES public.contas_contabeis(id);
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS forma_pagamento      text;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS banco                text;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS cartao               text;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS origem               text DEFAULT 'operacional';
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS lote_id              uuid REFERENCES public.importacao_lotes(id);
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS documento_pai_id     uuid REFERENCES public.financeiro_lancamentos(id) ON DELETE SET NULL;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS funcionario_id       uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS valor_pago           numeric DEFAULT 0;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS tipo_baixa           text;

CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_funcionario
  ON public.financeiro_lancamentos(funcionario_id) WHERE funcionario_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- 22. financeiro_baixas
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financeiro_baixas (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id    uuid    NOT NULL REFERENCES public.financeiro_lancamentos(id) ON DELETE CASCADE,
  valor_pago       numeric NOT NULL,
  desconto         numeric DEFAULT 0,
  juros            numeric DEFAULT 0,
  multa            numeric DEFAULT 0,
  abatimento       numeric DEFAULT 0,
  data_baixa       date    NOT NULL,
  forma_pagamento  text,
  conta_bancaria_id uuid   REFERENCES public.contas_bancarias(id),
  observacoes      text,
  usuario_id       uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.financeiro_baixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/financeiro can manage financeiro_baixas" ON public.financeiro_baixas;
DROP POLICY IF EXISTS "Auth users can read financeiro_baixas"         ON public.financeiro_baixas;
CREATE POLICY "Admin/financeiro can manage financeiro_baixas" ON public.financeiro_baixas FOR ALL    TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Auth users can read financeiro_baixas"         ON public.financeiro_baixas FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────
-- 23. pedidos_compra
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pedidos_compra (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                text        NOT NULL,
  fornecedor_id         uuid        REFERENCES public.fornecedores(id),
  data_pedido           date        NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista date,
  valor_total           numeric     DEFAULT 0,
  status                text        NOT NULL DEFAULT 'pendente',
  observacoes           text,
  cotacao_compra_id     uuid        REFERENCES public.cotacoes_compra(id),
  usuario_id            uuid,
  ativo                 boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/financeiro can manage pedidos_compra" ON public.pedidos_compra;
DROP POLICY IF EXISTS "Auth users can read pedidos_compra"         ON public.pedidos_compra;
CREATE POLICY "Admin/financeiro can manage pedidos_compra" ON public.pedidos_compra FOR ALL    TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Auth users can read pedidos_compra"         ON public.pedidos_compra FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_pedidos_compra_updated_at ON public.pedidos_compra;
CREATE TRIGGER update_pedidos_compra_updated_at BEFORE UPDATE ON public.pedidos_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS data_entrega_real  date;
ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS frete_valor        numeric DEFAULT 0;
ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS condicao_pagamento text;

CREATE TABLE IF NOT EXISTS public.pedidos_compra_itens (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_compra_id  uuid    NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  produto_id        uuid    NOT NULL REFERENCES public.produtos(id),
  quantidade        numeric NOT NULL,
  valor_unitario    numeric NOT NULL,
  valor_total       numeric NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos_compra_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/financeiro can manage pedidos_compra_itens" ON public.pedidos_compra_itens;
DROP POLICY IF EXISTS "Auth users can read pedidos_compra_itens"         ON public.pedidos_compra_itens;
CREATE POLICY "Admin/financeiro can manage pedidos_compra_itens" ON public.pedidos_compra_itens FOR ALL    TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Auth users can read pedidos_compra_itens"         ON public.pedidos_compra_itens FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────
-- 24. estoque_movimentos
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id              uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id      uuid                    NOT NULL REFERENCES public.produtos(id),
  tipo            tipo_movimento_estoque  NOT NULL,
  quantidade      numeric(10,2)           NOT NULL,
  saldo_anterior  numeric(10,2)           NOT NULL DEFAULT 0,
  saldo_atual     numeric(10,2)           NOT NULL DEFAULT 0,
  motivo          text,
  documento_id    uuid,
  documento_tipo  text,
  usuario_id      uuid                    REFERENCES auth.users(id),
  created_at      timestamptz             NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD estoque_movimentos" ON public.estoque_movimentos;
CREATE POLICY "Auth users can CRUD estoque_movimentos" ON public.estoque_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 25. compras (XML / legacy purchase orders)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compras (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  numero         text           NOT NULL UNIQUE,
  fornecedor_id  uuid           REFERENCES public.fornecedores(id),
  data_compra    date           NOT NULL DEFAULT CURRENT_DATE,
  data_entrega   date,
  valor_total    numeric(10,2)  DEFAULT 0,
  observacoes    text,
  status         status_pedido  NOT NULL DEFAULT 'rascunho',
  usuario_id     uuid           REFERENCES auth.users(id),
  ativo          boolean        NOT NULL DEFAULT true,
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD compras" ON public.compras;
CREATE POLICY "Auth users can CRUD compras" ON public.compras FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_compras_updated_at ON public.compras;
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS chave_acesso          text UNIQUE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_entrega_prevista date;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_entrega_real     date;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS frete_valor           numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS impostos_valor        numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_produtos        numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.compras_itens (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id      uuid    NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  produto_id     uuid    NOT NULL REFERENCES public.produtos(id),
  quantidade     numeric NOT NULL,
  valor_unitario numeric NOT NULL,
  valor_total    numeric NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compras_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD compras_itens" ON public.compras_itens;
CREATE POLICY "Auth users can CRUD compras_itens" ON public.compras_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 26. caixa_movimentos
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caixa_movimentos (
  id             uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           tipo_caixa NOT NULL,
  descricao      text       NOT NULL,
  valor          numeric    NOT NULL,
  saldo_anterior numeric    NOT NULL DEFAULT 0,
  saldo_atual    numeric    NOT NULL DEFAULT 0,
  referencia_id  uuid,
  referencia_tipo text,
  usuario_id     uuid       REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD caixa_movimentos" ON public.caixa_movimentos;
CREATE POLICY "Auth users can CRUD caixa_movimentos" ON public.caixa_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 27. auditoria_logs
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       uuid        REFERENCES auth.users(id),
  acao             text        NOT NULL,
  tabela           text        NOT NULL,
  registro_id      uuid,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  ip_address       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can insert audit logs" ON public.auditoria_logs;
DROP POLICY IF EXISTS "Admins can view audit logs"       ON public.auditoria_logs;
CREATE POLICY "Auth users can insert audit logs" ON public.auditoria_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view audit logs"       ON public.auditoria_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ──────────────────────────────────────────────────────────
-- 28. user_permissions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_key text        NOT NULL,
  ativo          boolean     NOT NULL DEFAULT true,
  origem         text        NOT NULL DEFAULT 'manual',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  updated_by     uuid,
  UNIQUE (user_id, permission_key)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_permissions_select"        ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_admin_manage"  ON public.user_permissions;
CREATE POLICY "user_permissions_select"       ON public.user_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_permissions_admin_manage" ON public.user_permissions FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ──────────────────────────────────────────────────────────
-- 29. permissions catalogue
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permissions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resource       text        NOT NULL,
  action         text        NOT NULL,
  permission_key text        GENERATED ALWAYS AS (resource || ':' || action) STORED,
  descricao      text,
  ativo          boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resource, action),
  UNIQUE(permission_key)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissions_select"        ON public.permissions;
DROP POLICY IF EXISTS "permissions_admin_manage"  ON public.permissions;
CREATE POLICY "permissions_select"       ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_admin_manage" ON public.permissions FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ──────────────────────────────────────────────────────────
-- 30. role_permissions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  role           app_role    NOT NULL,
  permission_key text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  UNIQUE(role, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_select"        ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin_manage"  ON public.role_permissions;
CREATE POLICY "role_permissions_select"       ON public.role_permissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "role_permissions_admin_manage" ON public.role_permissions FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ──────────────────────────────────────────────────────────
-- 31. permission_audit
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permission_audit (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid,
  target_user_id  uuid,
  role_padrao     app_role,
  alteracao       jsonb       NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permission_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permission_audit_admin" ON public.permission_audit;
CREATE POLICY "permission_audit_admin" ON public.permission_audit FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ──────────────────────────────────────────────────────────
-- 32. formas_pagamento
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao        text        NOT NULL,
  tipo             text        NOT NULL DEFAULT 'boleto',
  prazo_dias       integer     NOT NULL DEFAULT 0,
  parcelas         integer     NOT NULL DEFAULT 1,
  intervalos_dias  jsonb       DEFAULT '[]'::jsonb,
  gera_financeiro  boolean     NOT NULL DEFAULT true,
  observacoes      text,
  ativo            boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD formas_pagamento" ON public.formas_pagamento;
CREATE POLICY "Auth users can CRUD formas_pagamento" ON public.formas_pagamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 33. produto_composicoes
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.produto_composicoes (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_pai_id  uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_filho_id uuid   NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade      numeric NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_pai_id, produto_filho_id)
);
ALTER TABLE public.produto_composicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD produto_composicoes" ON public.produto_composicoes;
CREATE POLICY "Auth users can CRUD produto_composicoes" ON public.produto_composicoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 34. produtos_fornecedores
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.produtos_fornecedores (
  id                       uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id               uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fornecedor_id            uuid    NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  referencia_fornecedor    text,
  preco_compra             numeric(10,2),
  lead_time_dias           integer,
  descricao_fornecedor     text,
  unidade_fornecedor       text,
  eh_principal             boolean DEFAULT false,
  ultima_compra            date,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(produto_id, fornecedor_id)
);
ALTER TABLE public.produtos_fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD produtos_fornecedores" ON public.produtos_fornecedores;
CREATE POLICY "Auth users can CRUD produtos_fornecedores" ON public.produtos_fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 35. precos_especiais
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.precos_especiais (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id          uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  cliente_id          uuid    REFERENCES public.clientes(id) ON DELETE CASCADE,
  grupo_economico_id  uuid    REFERENCES public.grupos_economicos(id) ON DELETE CASCADE,
  preco_especial      numeric NOT NULL,
  desconto_percentual numeric DEFAULT 0,
  data_inicio         date,
  data_fim            date,
  observacoes         text,
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.precos_especiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD precos_especiais" ON public.precos_especiais;
CREATE POLICY "Auth users can CRUD precos_especiais" ON public.precos_especiais FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 36. cliente_transportadoras
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cliente_transportadoras (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        uuid    NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  transportadora_id uuid    NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  prioridade        integer DEFAULT 1,
  modalidade        text,
  prazo_medio       text,
  observacoes       text,
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, transportadora_id)
);
ALTER TABLE public.cliente_transportadoras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD cliente_transportadoras" ON public.cliente_transportadoras;
CREATE POLICY "Auth users can CRUD cliente_transportadoras" ON public.cliente_transportadoras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 37. remessas + remessa_eventos
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.remessas (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            text        NOT NULL,
  data_remessa      date        NOT NULL DEFAULT CURRENT_DATE,
  transportadora_id uuid        REFERENCES public.transportadoras(id),
  nota_fiscal_id    uuid        REFERENCES public.notas_fiscais(id),
  pedido_compra_id  uuid        REFERENCES public.pedidos_compra(id),
  status            text        NOT NULL DEFAULT 'pendente',
  rastreio          text,
  observacoes       text,
  usuario_id        uuid,
  ativo             boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.remessas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD remessas" ON public.remessas;
CREATE POLICY "Auth users can CRUD remessas" ON public.remessas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.remessa_eventos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  remessa_id  uuid        NOT NULL REFERENCES public.remessas(id) ON DELETE CASCADE,
  status      text        NOT NULL,
  descricao   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.remessa_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD remessa_eventos" ON public.remessa_eventos;
CREATE POLICY "Auth users can CRUD remessa_eventos" ON public.remessa_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 38. importacao_logs + staging tables
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.importacao_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id      uuid        NOT NULL REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  nivel        text        NOT NULL DEFAULT 'info',
  mensagem     text        NOT NULL,
  linha        integer,
  campo        text,
  valor        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.importacao_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD importacao_logs" ON public.importacao_logs;
CREATE POLICY "Auth users can CRUD importacao_logs" ON public.importacao_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.produto_alias_importacao (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_externo   text  NOT NULL,
  produto_id       uuid  NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fornecedor_id    uuid  REFERENCES public.fornecedores(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(codigo_externo, fornecedor_id)
);
ALTER TABLE public.produto_alias_importacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD produto_alias_importacao" ON public.produto_alias_importacao;
CREATE POLICY "Auth users can CRUD produto_alias_importacao" ON public.produto_alias_importacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staging tables (minimal schema; full details in dedicated migrations)
CREATE TABLE IF NOT EXISTS public.stg_produtos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid        REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  dados_raw   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'pendente',
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stg_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD stg_produtos" ON public.stg_produtos;
CREATE POLICY "Auth users can CRUD stg_produtos" ON public.stg_produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stg_clientes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid        REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  dados_raw   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'pendente',
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stg_clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD stg_clientes" ON public.stg_clientes;
CREATE POLICY "Auth users can CRUD stg_clientes" ON public.stg_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stg_fornecedores (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid        REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  dados_raw   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'pendente',
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stg_fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD stg_fornecedores" ON public.stg_fornecedores;
CREATE POLICY "Auth users can CRUD stg_fornecedores" ON public.stg_fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stg_estoque_inicial (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid        REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  dados_raw   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'pendente',
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stg_estoque_inicial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD stg_estoque_inicial" ON public.stg_estoque_inicial;
CREATE POLICY "Auth users can CRUD stg_estoque_inicial" ON public.stg_estoque_inicial FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stg_financeiro_aberto (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid        REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  dados_raw   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'pendente',
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stg_financeiro_aberto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD stg_financeiro_aberto" ON public.stg_financeiro_aberto;
CREATE POLICY "Auth users can CRUD stg_financeiro_aberto" ON public.stg_financeiro_aberto FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stg_faturamento (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid        REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  dados_raw   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'pendente',
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stg_faturamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD stg_faturamento" ON public.stg_faturamento;
CREATE POLICY "Auth users can CRUD stg_faturamento" ON public.stg_faturamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stg_compras_xml (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id     uuid        REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
  dados_raw   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'pendente',
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stg_compras_xml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can CRUD stg_compras_xml" ON public.stg_compras_xml;
CREATE POLICY "Auth users can CRUD stg_compras_xml" ON public.stg_compras_xml FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 39. folha de pagamento
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.folha_pagamento (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id     uuid          NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  competencia        text          NOT NULL,
  salario_base       numeric(12,2) NOT NULL DEFAULT 0,
  proventos          numeric(12,2) NOT NULL DEFAULT 0,
  descontos          numeric(12,2) NOT NULL DEFAULT 0,
  valor_liquido      numeric(12,2) NOT NULL DEFAULT 0,
  observacoes        text,
  status             text          NOT NULL DEFAULT 'pendente',
  financeiro_gerado  boolean       NOT NULL DEFAULT false,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/financeiro can manage folha_pagamento" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Auth users can read folha_pagamento"         ON public.folha_pagamento;
CREATE POLICY "Admin/financeiro can manage folha_pagamento" ON public.folha_pagamento FOR ALL    TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Auth users can read folha_pagamento"         ON public.folha_pagamento FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.fopag_verbas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      text        NOT NULL UNIQUE,
  descricao   text        NOT NULL,
  tipo        text        NOT NULL DEFAULT 'provento',
  incide_inss boolean     NOT NULL DEFAULT false,
  incide_irrf boolean     NOT NULL DEFAULT false,
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fopag_verbas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/financeiro can manage fopag_verbas" ON public.fopag_verbas;
CREATE POLICY "Admin/financeiro can manage fopag_verbas" ON public.fopag_verbas FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));

CREATE TABLE IF NOT EXISTS public.fopag_itens (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id         uuid          NOT NULL REFERENCES public.folha_pagamento(id) ON DELETE CASCADE,
  verba_id         uuid          NOT NULL REFERENCES public.fopag_verbas(id),
  quantidade       numeric       NOT NULL DEFAULT 1,
  valor_unitario   numeric(12,2) NOT NULL DEFAULT 0,
  valor_total      numeric(12,2) NOT NULL DEFAULT 0,
  created_at       timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.fopag_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/financeiro can manage fopag_itens" ON public.fopag_itens;
CREATE POLICY "Admin/financeiro can manage fopag_itens" ON public.fopag_itens FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));

-- ──────────────────────────────────────────────────────────
-- 40. Reload PostgREST schema cache
-- ──────────────────────────────────────────────────────────
SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';
