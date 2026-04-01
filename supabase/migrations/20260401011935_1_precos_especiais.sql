
-- 1. precos_especiais
CREATE TABLE IF NOT EXISTS public.precos_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  preco_especial numeric NOT NULL DEFAULT 0,
  vigencia_inicio date,
  vigencia_fim date,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.precos_especiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD precos_especiais" ON public.precos_especiais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. importacao_lotes
CREATE TABLE IF NOT EXISTS public.importacao_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_importacao text NOT NULL,
  arquivo_nome text,
  status text NOT NULL DEFAULT 'pendente',
  total_lidos integer DEFAULT 0,
  total_validos integer DEFAULT 0,
  total_erros integer DEFAULT 0,
  total_importados integer DEFAULT 0,
  mapeamento jsonb,
  observacoes text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.importacao_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD importacao_lotes" ON public.importacao_lotes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. importacao_logs
CREATE TABLE IF NOT EXISTS public.importacao_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_importacao_id uuid REFERENCES public.importacao_lotes(id) ON DELETE CASCADE NOT NULL,
  nivel text NOT NULL DEFAULT 'info',
  etapa text,
  mensagem text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.importacao_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD importacao_logs" ON public.importacao_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. stg_estoque_inicial
CREATE TABLE IF NOT EXISTS public.stg_estoque_inicial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_importacao_id uuid REFERENCES public.importacao_lotes(id) ON DELETE CASCADE NOT NULL,
  arquivo_origem text,
  aba_origem text,
  linha_origem integer,
  payload jsonb,
  status_validacao text NOT NULL DEFAULT 'pendente',
  motivo_erro text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stg_estoque_inicial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD stg_estoque_inicial" ON public.stg_estoque_inicial
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. stg_faturamento
CREATE TABLE IF NOT EXISTS public.stg_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_importacao_id uuid REFERENCES public.importacao_lotes(id) ON DELETE CASCADE NOT NULL,
  arquivo_origem text,
  aba_origem text,
  payload jsonb,
  status_validacao text NOT NULL DEFAULT 'pendente',
  motivo_erro text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stg_faturamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD stg_faturamento" ON public.stg_faturamento
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. stg_financeiro_aberto
CREATE TABLE IF NOT EXISTS public.stg_financeiro_aberto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_importacao_id uuid REFERENCES public.importacao_lotes(id) ON DELETE CASCADE NOT NULL,
  arquivo_origem text,
  aba_origem text,
  linha_origem integer,
  payload jsonb,
  status_validacao text NOT NULL DEFAULT 'pendente',
  motivo_erro text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stg_financeiro_aberto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD stg_financeiro_aberto" ON public.stg_financeiro_aberto
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. stg_compras_xml
CREATE TABLE IF NOT EXISTS public.stg_compras_xml (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_importacao_id uuid REFERENCES public.importacao_lotes(id) ON DELETE CASCADE NOT NULL,
  arquivo_origem text,
  payload jsonb,
  status_validacao text NOT NULL DEFAULT 'pendente',
  motivo_erro text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stg_compras_xml ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD stg_compras_xml" ON public.stg_compras_xml
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Add missing columns to remessas
ALTER TABLE public.remessas ADD COLUMN IF NOT EXISTS pedido_compra_id uuid REFERENCES public.pedidos_compra(id);
ALTER TABLE public.remessas ADD COLUMN IF NOT EXISTS nota_fiscal_id uuid REFERENCES public.notas_fiscais(id);
