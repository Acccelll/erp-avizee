
-- Create contas_contabeis table
CREATE TABLE public.contas_contabeis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  natureza TEXT NOT NULL DEFAULT 'devedora',
  aceita_lancamento BOOLEAN NOT NULL DEFAULT true,
  conta_pai_id UUID REFERENCES public.contas_contabeis(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contas_contabeis ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Auth users can CRUD contas_contabeis" ON public.contas_contabeis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add conta_contabil_id to financeiro_lancamentos
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS conta_contabil_id UUID REFERENCES public.contas_contabeis(id);

-- Add conta_contabil_id to notas_fiscais
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS conta_contabil_id UUID REFERENCES public.contas_contabeis(id);

-- Add conta_contabil_id to grupos_produto for default mapping
ALTER TABLE public.grupos_produto
  ADD COLUMN IF NOT EXISTS conta_contabil_id UUID REFERENCES public.contas_contabeis(id);
