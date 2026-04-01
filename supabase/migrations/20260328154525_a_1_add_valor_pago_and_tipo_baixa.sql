-- A.1: Add valor_pago and tipo_baixa to financeiro_lancamentos
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tipo_baixa TEXT;

-- A.2: Add conta_bancaria_id and forma_pagamento to caixa_movimentos
ALTER TABLE public.caixa_movimentos
  ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

CREATE INDEX IF NOT EXISTS idx_caixa_conta_bancaria ON public.caixa_movimentos(conta_bancaria_id);