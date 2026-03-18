-- Configurações da aplicação
CREATE TABLE IF NOT EXISTS public.app_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_configuracoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_configuracoes'
      AND policyname = 'Auth users can CRUD app_configuracoes'
  ) THEN
    CREATE POLICY "Auth users can CRUD app_configuracoes"
      ON public.app_configuracoes
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_app_configuracoes_updated_at ON public.app_configuracoes;
CREATE TRIGGER update_app_configuracoes_updated_at
BEFORE UPDATE ON public.app_configuracoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.app_configuracoes (chave, valor, descricao)
VALUES
  (
    'geral',
    jsonb_build_object(
      'empresa', 'AviZee Equipamentos LTDA',
      'nomeFantasia', 'AviZee',
      'logoUrl', '/images/logoavizee.png',
      'corPrimaria', '#690500',
      'corSecundaria', '#b2592c'
    ),
    'Configurações gerais da empresa'
  ),
  (
    'fiscal',
    jsonb_build_object(
      'cfopPadraoVenda', '5102',
      'cfopPadraoCompra', '1102',
      'cstPadrao', '000',
      'ncmPadrao', '00000000',
      'gerarFinanceiroPadrao', true
    ),
    'Parâmetros fiscais padrão'
  ),
  (
    'financeiro',
    jsonb_build_object(
      'formaPagamentoPadrao', 'boleto',
      'condicaoPadrao', '30 dias',
      'bancoPadrao', 'Inter',
      'permitirBaixaParcial', true
    ),
    'Parâmetros financeiros padrão'
  )
ON CONFLICT (chave) DO NOTHING;

-- Produtos compostos e preço sugerido
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_composto numeric(10,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS markup_percentual numeric(10,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_sugerido numeric(10,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalcular_custo_produto_composto(p_produto_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_custo numeric(10,2);
  v_markup numeric(10,2);
BEGIN
  SELECT COALESCE(SUM(pc.quantidade * COALESCE(p.preco_custo, 0)), 0)
    INTO v_custo
  FROM public.produto_composicoes pc
  JOIN public.produtos p ON p.id = pc.produto_filho_id
  WHERE pc.produto_pai_id = p_produto_id;

  SELECT COALESCE(markup_percentual, 0)
    INTO v_markup
  FROM public.produtos
  WHERE id = p_produto_id;

  UPDATE public.produtos
     SET custo_composto = COALESCE(v_custo, 0),
         preco_sugerido = ROUND(COALESCE(v_custo, 0) * (1 + COALESCE(v_markup, 0) / 100.0), 2),
         updated_at = now()
   WHERE id = p_produto_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_recalcular_custo_produto_composto()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_produto_id uuid;
BEGIN
  v_produto_id := COALESCE(NEW.produto_pai_id, OLD.produto_pai_id);
  PERFORM public.recalcular_custo_produto_composto(v_produto_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS recalcular_custo_produto_composto_on_composicao ON public.produto_composicoes;
CREATE TRIGGER recalcular_custo_produto_composto_on_composicao
AFTER INSERT OR UPDATE OR DELETE ON public.produto_composicoes
FOR EACH ROW EXECUTE FUNCTION public.tg_recalcular_custo_produto_composto();

CREATE OR REPLACE FUNCTION public.tg_recalcular_custo_produto_composto_on_produto()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_produto_id uuid;
BEGIN
  FOR v_produto_id IN
    SELECT DISTINCT produto_pai_id
    FROM public.produto_composicoes
    WHERE produto_filho_id = NEW.id
  LOOP
    PERFORM public.recalcular_custo_produto_composto(v_produto_id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalcular_custo_produto_composto_on_produto ON public.produtos;
CREATE TRIGGER recalcular_custo_produto_composto_on_produto
AFTER UPDATE OF preco_custo, markup_percentual ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.tg_recalcular_custo_produto_composto_on_produto();
