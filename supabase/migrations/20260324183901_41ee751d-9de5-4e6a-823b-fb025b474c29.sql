
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS documento_pai_id uuid REFERENCES public.financeiro_lancamentos(id) ON DELETE SET NULL;
