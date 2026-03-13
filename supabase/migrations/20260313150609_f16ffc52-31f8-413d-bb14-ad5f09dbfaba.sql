
-- empresa_config for institutional header
CREATE TABLE IF NOT EXISTS public.empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL DEFAULT 'AVIZEE EQUIPAMENTOS LTDA',
  nome_fantasia TEXT NOT NULL DEFAULT 'AVIZEE',
  cnpj TEXT DEFAULT '53.078.538/0001-85',
  inscricao_estadual TEXT,
  telefone TEXT DEFAULT '(19) 99898-2930',
  email TEXT,
  logradouro TEXT DEFAULT 'RUA ADA CAROLINE SCARANO, 259',
  bairro TEXT DEFAULT 'JOAO ARANHA',
  cidade TEXT DEFAULT 'PAULÍNIA',
  uf TEXT DEFAULT 'SP',
  cep TEXT DEFAULT '13145-794',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read empresa_config" ON public.empresa_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage empresa_config" ON public.empresa_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add complemento to fornecedores if missing
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;

-- Add banco/cartao to financeiro_lancamentos (already has banco/cartao columns per types)
-- Add parcela support
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcela_numero INT;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcela_total INT;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS documento_fiscal_id UUID REFERENCES public.notas_fiscais(id);

-- Add valor_produtos, frete_valor, impostos_valor to compras if needed
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_produtos NUMERIC(14,2) DEFAULT 0;

-- Insert default empresa config
INSERT INTO public.empresa_config (razao_social, nome_fantasia, cnpj, telefone, logradouro, bairro, cidade, uf, cep)
VALUES ('AVIZEE EQUIPAMENTOS LTDA', 'AVIZEE', '53.078.538/0001-85', '(19) 99898-2930', 'RUA ADA CAROLINE SCARANO, 259', 'JOAO ARANHA', 'PAULÍNIA', 'SP', '13145-794')
ON CONFLICT DO NOTHING;
