
-- Create bancos table
CREATE TABLE public.bancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'banco',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD bancos" ON public.bancos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create contas_bancarias table
CREATE TABLE public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id uuid NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  agencia text,
  conta text,
  titular text,
  saldo_atual numeric DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD contas_bancarias" ON public.contas_bancarias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add conta_bancaria_id to financeiro_lancamentos
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN conta_bancaria_id uuid REFERENCES public.contas_bancarias(id);

-- Add updated_at triggers
CREATE TRIGGER update_bancos_updated_at BEFORE UPDATE ON public.bancos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
