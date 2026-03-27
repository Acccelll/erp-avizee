
-- 1. Create transportadoras table
CREATE TABLE IF NOT EXISTS public.transportadoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_razao_social text NOT NULL,
  nome_fantasia text,
  cpf_cnpj text,
  contato text,
  telefone text,
  email text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  modalidade text DEFAULT 'rodoviario',
  prazo_medio text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD transportadoras" ON public.transportadoras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Enrich produtos_fornecedores with extra columns
ALTER TABLE public.produtos_fornecedores
  ADD COLUMN IF NOT EXISTS descricao_fornecedor text,
  ADD COLUMN IF NOT EXISTS unidade_fornecedor text,
  ADD COLUMN IF NOT EXISTS eh_principal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultima_compra date;

-- 3. Create cliente_transportadoras junction table
CREATE TABLE IF NOT EXISTS public.cliente_transportadoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  transportadora_id uuid NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  prioridade integer DEFAULT 1,
  modalidade text,
  prazo_medio text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, transportadora_id)
);

ALTER TABLE public.cliente_transportadoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD cliente_transportadoras" ON public.cliente_transportadoras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Add payment preferences to clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS forma_pagamento_padrao text,
  ADD COLUMN IF NOT EXISTS prazo_preferencial integer;

-- 5. Create pedidos_compra table
CREATE TABLE IF NOT EXISTS public.pedidos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  data_pedido date NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista date,
  valor_total numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  cotacao_compra_id uuid REFERENCES public.cotacoes_compra(id),
  usuario_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedidos_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_compra_id uuid NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric NOT NULL,
  valor_unitario numeric NOT NULL,
  valor_total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/financeiro can manage pedidos_compra" ON public.pedidos_compra FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Auth users can read pedidos_compra" ON public.pedidos_compra FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/financeiro can manage pedidos_compra_itens" ON public.pedidos_compra_itens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Auth users can read pedidos_compra_itens" ON public.pedidos_compra_itens FOR SELECT TO authenticated USING (true);

-- 6. Create financeiro_baixas table
CREATE TABLE IF NOT EXISTS public.financeiro_baixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL REFERENCES public.financeiro_lancamentos(id) ON DELETE CASCADE,
  valor_pago numeric NOT NULL,
  desconto numeric DEFAULT 0,
  juros numeric DEFAULT 0,
  multa numeric DEFAULT 0,
  abatimento numeric DEFAULT 0,
  data_baixa date NOT NULL,
  forma_pagamento text,
  conta_bancaria_id uuid REFERENCES public.contas_bancarias(id),
  observacoes text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_baixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/financeiro can manage financeiro_baixas" ON public.financeiro_baixas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Auth users can read financeiro_baixas" ON public.financeiro_baixas FOR SELECT TO authenticated USING (true);

-- Add saldo_restante to financeiro_lancamentos for partial payments
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS saldo_restante numeric;
