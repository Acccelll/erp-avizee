-- Verbas (proventos e descontos)
CREATE TABLE IF NOT EXISTS public.fopag_verbas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('provento', 'desconto', 'informativo')),
  incide_inss BOOLEAN DEFAULT false,
  incide_irrf BOOLEAN DEFAULT false,
  incide_fgts BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.fopag_verbas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read fopag_verbas" ON public.fopag_verbas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can manage fopag_verbas" ON public.fopag_verbas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

-- Itens de folha (verbas lançadas por funcionário)
CREATE TABLE IF NOT EXISTS public.fopag_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id UUID NOT NULL REFERENCES public.folha_pagamento(id) ON DELETE CASCADE,
  verba_id UUID REFERENCES public.fopag_verbas(id),
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('provento', 'desconto', 'informativo')),
  referencia NUMERIC(10,4),
  valor NUMERIC(10,2) NOT NULL
);

ALTER TABLE public.fopag_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/financeiro can manage fopag_itens" ON public.fopag_itens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Auth users can read fopag_itens" ON public.fopag_itens FOR SELECT TO authenticated USING (true);

-- Verbas padrão
INSERT INTO public.fopag_verbas (codigo, descricao, tipo, incide_inss, incide_irrf, incide_fgts) VALUES
  ('001', 'Salário base', 'provento', true, true, true),
  ('002', 'Hora Extra 50%', 'provento', true, true, true),
  ('003', 'Comissão', 'provento', true, true, true),
  ('004', 'Vale Refeição', 'provento', false, false, false),
  ('010', 'Vale Transporte (desconto 6%)', 'desconto', false, false, false),
  ('011', 'INSS Empregado', 'desconto', false, false, false),
  ('012', 'IRRF', 'desconto', false, false, false),
  ('013', 'Adiantamento Salarial', 'desconto', false, false, false),
  ('099', 'INSS Patronal 20%', 'informativo', false, false, false),
  ('100', 'FGTS 8%', 'informativo', false, false, false)
ON CONFLICT (codigo) DO NOTHING;
