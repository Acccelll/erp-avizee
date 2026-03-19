
-- App configuration key-value table for system settings
CREATE TABLE public.app_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor jsonb DEFAULT '{}'::jsonb,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_configuracoes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage app configurations
CREATE POLICY "Admins can manage app_configuracoes"
  ON public.app_configuracoes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read configurations
CREATE POLICY "Auth users can read app_configuracoes"
  ON public.app_configuracoes
  FOR SELECT
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_app_configuracoes_updated_at
  BEFORE UPDATE ON public.app_configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
