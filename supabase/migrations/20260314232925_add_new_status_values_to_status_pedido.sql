
-- Add new status values to status_pedido enum for cotação flow
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'aprovado';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'convertido';

-- Create status enums for ordens de venda
CREATE TYPE public.status_ordem_venda AS ENUM ('pendente', 'aprovada', 'em_separacao', 'cancelada');
CREATE TYPE public.status_faturamento AS ENUM ('aguardando', 'parcial', 'total');

-- Ordens de Venda
CREATE TABLE public.ordens_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  cliente_id uuid REFERENCES public.clientes(id),
  cotacao_id uuid REFERENCES public.orcamentos(id),
  status status_ordem_venda NOT NULL DEFAULT 'pendente',
  status_faturamento status_faturamento NOT NULL DEFAULT 'aguardando',
  data_aprovacao date,
  data_prometida_despacho date,
  prazo_despacho_dias integer,
  valor_total numeric DEFAULT 0,
  observacoes text,
  usuario_id uuid,
  vendedor_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD ordens_venda"
  ON public.ordens_venda FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_ordens_venda_updated_at
  BEFORE UPDATE ON public.ordens_venda
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Ordens de Venda Itens
CREATE TABLE public.ordens_venda_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_venda_id uuid NOT NULL REFERENCES public.ordens_venda(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  codigo_snapshot text,
  descricao_snapshot text,
  variacao text,
  quantidade numeric NOT NULL,
  unidade text DEFAULT 'UN',
  valor_unitario numeric NOT NULL,
  valor_total numeric NOT NULL,
  peso_unitario numeric DEFAULT 0,
  peso_total numeric DEFAULT 0,
  quantidade_faturada numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_venda_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD ordens_venda_itens"
  ON public.ordens_venda_itens FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add ordem_venda_id to notas_fiscais for tracking invoicing
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS ordem_venda_id uuid REFERENCES public.ordens_venda(id);
