-- C.1: Create formas_pagamento table
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'boleto',
  prazo_dias INTEGER NOT NULL DEFAULT 0,
  parcelas INTEGER NOT NULL DEFAULT 1,
  intervalos_dias JSONB DEFAULT '[]'::jsonb,
  gera_financeiro BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD formas_pagamento"
  ON public.formas_pagamento FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Seed default payment methods
INSERT INTO public.formas_pagamento (descricao, tipo, prazo_dias, parcelas, intervalos_dias, gera_financeiro) VALUES
  ('À Vista', 'dinheiro', 0, 1, '[]', true),
  ('30/60/90 DDL', 'boleto', 30, 3, '[30, 60, 90]', true),
  ('Cartão de Crédito', 'cartao', 0, 1, '[]', true),
  ('PIX', 'pix', 0, 1, '[]', true);

-- C.3: Add po_number to ordens_venda
ALTER TABLE public.ordens_venda
  ADD COLUMN IF NOT EXISTS po_number TEXT;