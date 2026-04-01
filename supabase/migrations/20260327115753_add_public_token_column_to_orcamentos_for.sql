
-- Add public_token column to orcamentos for public sharing
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS public_token text UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_orcamentos_public_token ON public.orcamentos(public_token) WHERE public_token IS NOT NULL;

-- Allow anonymous reads on orcamentos by public_token
CREATE POLICY "Public can read orcamentos by token"
ON public.orcamentos
FOR SELECT
TO anon
USING (public_token IS NOT NULL AND ativo = true);

-- Allow anonymous reads on orcamentos_itens for public quotes
CREATE POLICY "Public can read orcamentos_itens for public quotes"
ON public.orcamentos_itens
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = orcamento_id AND o.public_token IS NOT NULL AND o.ativo = true
  )
);

-- Allow anonymous reads on empresa_config
CREATE POLICY "Public can read empresa_config"
ON public.empresa_config
FOR SELECT
TO anon
USING (true);

-- Enable realtime for financeiro_lancamentos (for notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.financeiro_lancamentos;
