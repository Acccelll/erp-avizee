
-- Create remessas table
CREATE TABLE public.remessas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_venda_id uuid REFERENCES public.ordens_venda(id),
  cliente_id uuid REFERENCES public.clientes(id),
  transportadora_id uuid REFERENCES public.transportadoras(id),
  servico text,
  codigo_rastreio text,
  data_postagem date,
  previsao_entrega date,
  status_transporte text NOT NULL DEFAULT 'pendente',
  peso numeric DEFAULT 0,
  volumes integer DEFAULT 1,
  valor_frete numeric DEFAULT 0,
  observacoes text,
  usuario_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create remessa_eventos table
CREATE TABLE public.remessa_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remessa_id uuid NOT NULL REFERENCES public.remessas(id) ON DELETE CASCADE,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  descricao text NOT NULL,
  local text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.remessas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remessa_eventos ENABLE ROW LEVEL SECURITY;

-- RLS policies for remessas
CREATE POLICY "Auth users can read remessas" ON public.remessas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert remessas" ON public.remessas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update remessas" ON public.remessas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can delete remessas" ON public.remessas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for remessa_eventos
CREATE POLICY "Auth users can read remessa_eventos" ON public.remessa_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert remessa_eventos" ON public.remessa_eventos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update remessa_eventos" ON public.remessa_eventos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can delete remessa_eventos" ON public.remessa_eventos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
