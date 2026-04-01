
-- Cotações de Compra: header
CREATE TABLE public.cotacoes_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  data_cotacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'finalizada', 'cancelada')),
  observacoes TEXT,
  usuario_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cotacoes_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read cotacoes_compra" ON public.cotacoes_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert cotacoes_compra" ON public.cotacoes_compra FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/financeiro can update cotacoes_compra" ON public.cotacoes_compra FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/financeiro can delete cotacoes_compra" ON public.cotacoes_compra FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));

-- Itens solicitados na cotação
CREATE TABLE public.cotacoes_compra_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_compra_id UUID NOT NULL REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'UN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cotacoes_compra_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read cotacoes_compra_itens" ON public.cotacoes_compra_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert cotacoes_compra_itens" ON public.cotacoes_compra_itens FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/financeiro can update cotacoes_compra_itens" ON public.cotacoes_compra_itens FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/financeiro can delete cotacoes_compra_itens" ON public.cotacoes_compra_itens FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));

-- Propostas dos fornecedores (uma por fornecedor por item)
CREATE TABLE public.cotacoes_compra_propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_compra_id UUID NOT NULL REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.cotacoes_compra_itens(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  prazo_entrega_dias INTEGER,
  observacoes TEXT,
  selecionado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cotacoes_compra_propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read cotacoes_compra_propostas" ON public.cotacoes_compra_propostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert cotacoes_compra_propostas" ON public.cotacoes_compra_propostas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/financeiro can update cotacoes_compra_propostas" ON public.cotacoes_compra_propostas FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/financeiro can delete cotacoes_compra_propostas" ON public.cotacoes_compra_propostas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));
