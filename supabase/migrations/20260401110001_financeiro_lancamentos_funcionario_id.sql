-- Adiciona vínculo opcional de lançamento financeiro com funcionário (FOPAG)
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL;

-- Índice para facilitar busca de lançamentos por funcionário
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_funcionario
  ON public.financeiro_lancamentos(funcionario_id)
  WHERE funcionario_id IS NOT NULL;
