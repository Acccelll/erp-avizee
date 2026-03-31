-- Tabela de Preços Especiais por Cliente
CREATE TABLE IF NOT EXISTS public.precos_especiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  preco_especial NUMERIC(15,2) NOT NULL,
  desconto_percentual NUMERIC(5,2),
  vigencia_inicio DATE,
  vigencia_fim DATE,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(cliente_id, produto_id)
);

-- Habilitar RLS
ALTER TABLE public.precos_especiais ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Auth users can read precos_especiais"
  ON public.precos_especiais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/vendedor/financeiro can manage precos_especiais"
  ON public.precos_especiais FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'vendedor'::app_role) OR
    public.has_role(auth.uid(), 'financeiro'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'vendedor'::app_role) OR
    public.has_role(auth.uid(), 'financeiro'::app_role)
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_precos_especiais_updated_at ON public.precos_especiais;
CREATE TRIGGER tr_precos_especiais_updated_at
  BEFORE UPDATE ON public.precos_especiais
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Comentários
COMMENT ON TABLE public.precos_especiais IS 'Armazena exceções de preço para produtos específicos por cliente.';
