-- E.1: Funcionarios table
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  cargo TEXT,
  departamento TEXT,
  data_admissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_demissao DATE,
  salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo_contrato TEXT NOT NULL DEFAULT 'clt',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage funcionarios"
  ON public.funcionarios FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Auth users can read funcionarios"
  ON public.funcionarios FOR SELECT
  TO authenticated USING (true);

-- E.1: Folha de pagamento mensal
CREATE TABLE IF NOT EXISTS public.folha_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  proventos NUMERIC(12,2) NOT NULL DEFAULT 0,
  descontos NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  financeiro_gerado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/financeiro can manage folha_pagamento"
  ON public.folha_pagamento FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Auth users can read folha_pagamento"
  ON public.folha_pagamento FOR SELECT
  TO authenticated USING (true);