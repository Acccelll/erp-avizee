-- B.1: Add modelo_documento to notas_fiscais
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS modelo_documento TEXT NOT NULL DEFAULT '55';

-- B.2: Add nf_referenciada_id and tipo_operacao to notas_fiscais
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS nf_referenciada_id UUID REFERENCES public.notas_fiscais(id),
  ADD COLUMN IF NOT EXISTS tipo_operacao TEXT DEFAULT 'normal';