
-- 1. Add new columns to orcamentos for full commercial document
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS vendedor_id uuid;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS imposto_st numeric DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS imposto_ipi numeric DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete_valor numeric DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS outras_despesas numeric DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS quantidade_total numeric DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS peso_total numeric DEFAULT 0;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS pagamento text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS prazo_pagamento text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS prazo_entrega text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete_tipo text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS modalidade text;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS cliente_snapshot jsonb;

-- 2. Add variacao and peso columns to orcamentos_itens
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS variacao text;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS unidade text DEFAULT 'UN';
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS peso_unitario numeric DEFAULT 0;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS peso_total numeric DEFAULT 0;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS codigo_snapshot text;
ALTER TABLE public.orcamentos_itens ADD COLUMN IF NOT EXISTS descricao_snapshot text;

-- 3. Create produto_composicoes table
CREATE TABLE IF NOT EXISTS public.produto_composicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_pai_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_filho_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL DEFAULT 1,
  ordem integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produto_composicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD produto_composicoes" ON public.produto_composicoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Add eh_composto flag to produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS eh_composto boolean DEFAULT false;

-- 5. Create cliente_registros_comunicacao table
CREATE TABLE IF NOT EXISTS public.cliente_registros_comunicacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_hora timestamptz NOT NULL DEFAULT now(),
  canal text,
  assunto text,
  descricao text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_registros_comunicacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD cliente_registros_comunicacao" ON public.cliente_registros_comunicacao
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Add missing columns to compras
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_entrega_prevista date;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_entrega_real date;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS frete_valor numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS impostos_valor numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_produtos numeric DEFAULT 0;

-- 7. Add forma_pagamento and condicao_pagamento to notas_fiscais
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS condicao_pagamento text DEFAULT 'a_vista';

-- 8. Add banco and cartao to financeiro_lancamentos
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS banco text;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS cartao text;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS forma_pagamento text;

-- 9. Add complemento and pais to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS contato text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Brasil';

-- 10. Add contato and pais to fornecedores
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS contato text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Brasil';
