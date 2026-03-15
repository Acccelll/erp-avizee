
-- 1. Create grupos_economicos table
CREATE TABLE public.grupos_economicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  empresa_matriz_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Add new columns to clientes
ALTER TABLE public.clientes
  ADD COLUMN grupo_economico_id UUID REFERENCES public.grupos_economicos(id) ON DELETE SET NULL,
  ADD COLUMN tipo_relacao_grupo TEXT DEFAULT 'independente',
  ADD COLUMN caixa_postal TEXT;

-- 3. RLS for grupos_economicos
ALTER TABLE public.grupos_economicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can CRUD grupos_economicos"
  ON public.grupos_economicos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Update trigger for updated_at
CREATE TRIGGER update_grupos_economicos_updated_at
  BEFORE UPDATE ON public.grupos_economicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
