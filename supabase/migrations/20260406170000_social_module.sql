-- Módulo Social (MVP)

CREATE TABLE IF NOT EXISTS public.social_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma text NOT NULL CHECK (plataforma IN ('instagram_business', 'linkedin_page')),
  nome_conta text NOT NULL,
  identificador_externo text NOT NULL,
  url_conta text,
  token_acesso text,
  token_refresh text,
  token_expira_em timestamptz,
  escopos text[] NOT NULL DEFAULT '{}'::text[],
  status_conexao text NOT NULL DEFAULT 'conectado' CHECK (status_conexao IN ('conectado', 'expirado', 'erro', 'desconectado')),
  ultima_sincronizacao timestamptz,
  ativo boolean NOT NULL DEFAULT true,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  usuario_criacao_id uuid REFERENCES auth.users(id),
  usuario_ultima_modificacao_id uuid REFERENCES auth.users(id),
  UNIQUE (plataforma, identificador_externo)
);

CREATE TABLE IF NOT EXISTS public.social_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.social_contas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  data_inicio date,
  data_fim date,
  ativo boolean NOT NULL DEFAULT true,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  usuario_criacao_id uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.social_metricas_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.social_contas(id) ON DELETE CASCADE,
  data_referencia date NOT NULL,
  seguidores_total integer NOT NULL DEFAULT 0,
  seguidores_novos integer NOT NULL DEFAULT 0,
  impressoes integer NOT NULL DEFAULT 0,
  alcance integer NOT NULL DEFAULT 0,
  visitas_perfil integer NOT NULL DEFAULT 0,
  cliques_link integer NOT NULL DEFAULT 0,
  engajamento_total integer NOT NULL DEFAULT 0,
  taxa_engajamento numeric(7,4) NOT NULL DEFAULT 0,
  quantidade_posts_periodo integer NOT NULL DEFAULT 0,
  observacoes text,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  usuario_criacao_id uuid REFERENCES auth.users(id),
  UNIQUE (conta_id, data_referencia)
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.social_contas(id) ON DELETE CASCADE,
  id_externo_post text NOT NULL,
  data_publicacao timestamptz NOT NULL,
  titulo_legenda text,
  legenda_completa text,
  url_post text,
  tipo_post text NOT NULL DEFAULT 'feed' CHECK (tipo_post IN ('feed', 'reels', 'story', 'video', 'artigo', 'carousel')),
  campanha_id uuid REFERENCES public.social_campanhas(id) ON DELETE SET NULL,
  impressoes integer NOT NULL DEFAULT 0,
  alcance integer NOT NULL DEFAULT 0,
  curtidas integer NOT NULL DEFAULT 0,
  comentarios integer NOT NULL DEFAULT 0,
  compartilhamentos integer NOT NULL DEFAULT 0,
  salvamentos integer NOT NULL DEFAULT 0,
  cliques integer NOT NULL DEFAULT 0,
  engajamento_total integer NOT NULL DEFAULT 0,
  taxa_engajamento numeric(7,4) NOT NULL DEFAULT 0,
  destaque boolean NOT NULL DEFAULT false,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  usuario_criacao_id uuid REFERENCES auth.users(id),
  usuario_ultima_modificacao_id uuid REFERENCES auth.users(id),
  UNIQUE (conta_id, id_externo_post)
);

CREATE TABLE IF NOT EXISTS public.social_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid REFERENCES public.social_contas(id) ON DELETE CASCADE,
  tipo_alerta text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  severidade text NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),
  resolvido boolean NOT NULL DEFAULT false,
  data_referencia date,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  usuario_criacao_id uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_social_metricas_conta_data ON public.social_metricas_snapshot (conta_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_conta_data ON public.social_posts (conta_id, data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_tipo ON public.social_posts (tipo_post);
CREATE INDEX IF NOT EXISTS idx_social_alertas_resolvido ON public.social_alertas (resolvido, severidade);

ALTER TABLE public.social_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_metricas_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read social_contas" ON public.social_contas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can manage social_contas" ON public.social_contas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Auth users can read social_metricas_snapshot" ON public.social_metricas_snapshot FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can manage social_metricas_snapshot" ON public.social_metricas_snapshot FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Auth users can read social_posts" ON public.social_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can manage social_posts" ON public.social_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Auth users can read social_alertas" ON public.social_alertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can manage social_alertas" ON public.social_alertas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Auth users can read social_campanhas" ON public.social_campanhas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can manage social_campanhas" ON public.social_campanhas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE OR REPLACE FUNCTION public.social_dashboard_consolidado(_data_inicio date DEFAULT (current_date - 30), _data_fim date DEFAULT current_date)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      c.plataforma,
      s.data_referencia,
      s.seguidores_total,
      s.seguidores_novos,
      s.engajamento_total,
      s.taxa_engajamento,
      s.impressoes,
      s.alcance,
      s.quantidade_posts_periodo
    FROM public.social_metricas_snapshot s
    JOIN public.social_contas c ON c.id = s.conta_id
    WHERE c.ativo = true AND s.data_referencia BETWEEN _data_inicio AND _data_fim
  ), agrupado AS (
    SELECT
      plataforma,
      COALESCE(SUM(seguidores_novos), 0) AS seguidores_novos,
      COALESCE(SUM(engajamento_total), 0) AS engajamento_total,
      ROUND(COALESCE(AVG(taxa_engajamento), 0), 4) AS taxa_engajamento_media,
      COALESCE(SUM(impressoes), 0) AS impressoes,
      COALESCE(SUM(alcance), 0) AS alcance,
      COALESCE(SUM(quantidade_posts_periodo), 0) AS quantidade_posts_periodo
    FROM base
    GROUP BY plataforma
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('data_inicio', _data_inicio, 'data_fim', _data_fim),
    'comparativo', COALESCE((SELECT jsonb_agg(to_jsonb(agrupado)) FROM agrupado), '[]'::jsonb),
    'totais', jsonb_build_object(
      'seguidores_novos', COALESCE((SELECT SUM(seguidores_novos) FROM base), 0),
      'engajamento_total', COALESCE((SELECT SUM(engajamento_total) FROM base), 0),
      'impressoes', COALESCE((SELECT SUM(impressoes) FROM base), 0),
      'alcance', COALESCE((SELECT SUM(alcance) FROM base), 0)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.social_metricas_periodo(_conta_id uuid, _data_inicio date DEFAULT (current_date - 30), _data_fim date DEFAULT current_date)
RETURNS SETOF public.social_metricas_snapshot
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.social_metricas_snapshot
  WHERE conta_id = _conta_id
    AND data_referencia BETWEEN _data_inicio AND _data_fim
  ORDER BY data_referencia ASC;
$$;

CREATE OR REPLACE FUNCTION public.social_posts_filtrados(_plataforma text DEFAULT NULL, _data_inicio date DEFAULT (current_date - 30), _data_fim date DEFAULT current_date, _tipo_post text DEFAULT NULL, _campanha_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  conta_id uuid,
  plataforma text,
  nome_conta text,
  id_externo_post text,
  data_publicacao timestamptz,
  titulo_legenda text,
  url_post text,
  tipo_post text,
  campanha_id uuid,
  impressoes integer,
  alcance integer,
  curtidas integer,
  comentarios integer,
  compartilhamentos integer,
  salvamentos integer,
  cliques integer,
  engajamento_total integer,
  taxa_engajamento numeric,
  destaque boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.conta_id, c.plataforma, c.nome_conta, p.id_externo_post, p.data_publicacao,
    p.titulo_legenda, p.url_post, p.tipo_post, p.campanha_id,
    p.impressoes, p.alcance, p.curtidas, p.comentarios, p.compartilhamentos,
    p.salvamentos, p.cliques, p.engajamento_total, p.taxa_engajamento, p.destaque
  FROM public.social_posts p
  JOIN public.social_contas c ON c.id = p.conta_id
  WHERE (_plataforma IS NULL OR c.plataforma = _plataforma)
    AND p.data_publicacao::date BETWEEN _data_inicio AND _data_fim
    AND (_tipo_post IS NULL OR p.tipo_post = _tipo_post)
    AND (_campanha_id IS NULL OR p.campanha_id = _campanha_id)
  ORDER BY p.data_publicacao DESC;
$$;

CREATE OR REPLACE FUNCTION public.social_alertas_periodo(_resolvido boolean DEFAULT NULL)
RETURNS SETOF public.social_alertas
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.social_alertas
  WHERE (_resolvido IS NULL OR resolvido = _resolvido)
  ORDER BY data_cadastro DESC;
$$;

CREATE OR REPLACE FUNCTION public.social_sincronizar_manual(_conta_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta record;
BEGIN
  FOR v_conta IN
    SELECT id, plataforma, nome_conta
    FROM public.social_contas
    WHERE ativo = true AND (_conta_id IS NULL OR id = _conta_id)
  LOOP
    INSERT INTO public.social_metricas_snapshot (
      conta_id, data_referencia, seguidores_total, seguidores_novos, impressoes, alcance,
      visitas_perfil, cliques_link, engajamento_total, taxa_engajamento, quantidade_posts_periodo,
      observacoes, usuario_criacao_id
    ) VALUES (
      v_conta.id,
      current_date,
      (2000 + (random() * 5000)::int),
      (5 + (random() * 50)::int),
      (5000 + (random() * 10000)::int),
      (3000 + (random() * 7000)::int),
      (50 + (random() * 200)::int),
      (10 + (random() * 80)::int),
      (100 + (random() * 500)::int),
      ROUND((1 + random() * 10)::numeric, 4),
      (1 + (random() * 8)::int),
      'Snapshot mockado via sincronização manual (MVP).',
      auth.uid()
    )
    ON CONFLICT (conta_id, data_referencia)
    DO UPDATE SET
      seguidores_total = EXCLUDED.seguidores_total,
      seguidores_novos = EXCLUDED.seguidores_novos,
      impressoes = EXCLUDED.impressoes,
      alcance = EXCLUDED.alcance,
      visitas_perfil = EXCLUDED.visitas_perfil,
      cliques_link = EXCLUDED.cliques_link,
      engajamento_total = EXCLUDED.engajamento_total,
      taxa_engajamento = EXCLUDED.taxa_engajamento,
      quantidade_posts_periodo = EXCLUDED.quantidade_posts_periodo,
      observacoes = EXCLUDED.observacoes,
      usuario_criacao_id = EXCLUDED.usuario_criacao_id;

    UPDATE public.social_contas
    SET ultima_sincronizacao = now(),
        usuario_ultima_modificacao_id = auth.uid()
    WHERE id = v_conta.id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'conta_id', _conta_id,
    'sincronizado_em', now(),
    'message', 'Sincronização manual executada com provider mock.'
  );
END;
$$;

COMMENT ON FUNCTION public.social_sincronizar_manual(uuid) IS 'MVP: endpoint de sincronização manual via provider mock. Estrutura pronta para scheduler/cron.';

-- Permissões declarativas do módulo (uso em UI/feature flag)
INSERT INTO public.app_configuracoes (chave, valor, descricao)
VALUES (
  'social.permissoes',
  '["social.visualizar","social.configurar","social.sincronizar","social.exportar_relatorios","social.gerenciar_alertas"]'::jsonb,
  'Permissões previstas para o módulo Social'
)
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, updated_at = now();

-- Seed inicial para facilitar o MVP
WITH first_user AS (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
), contas_seed AS (
  INSERT INTO public.social_contas (
    plataforma, nome_conta, identificador_externo, url_conta, escopos,
    status_conexao, ultima_sincronizacao, usuario_criacao_id, usuario_ultima_modificacao_id
  )
  SELECT 'instagram_business', 'AviZee Oficial', 'ig-avizee-oficial', 'https://instagram.com/avizee', ARRAY['insights_read', 'pages_read_engagement'], 'conectado', now() - interval '1 day', id, id FROM first_user
  WHERE NOT EXISTS (SELECT 1 FROM public.social_contas WHERE identificador_externo = 'ig-avizee-oficial')
  RETURNING id
)
INSERT INTO public.social_posts (
  conta_id, id_externo_post, data_publicacao, titulo_legenda, legenda_completa, url_post, tipo_post,
  impressoes, alcance, curtidas, comentarios, compartilhamentos, salvamentos, cliques,
  engajamento_total, taxa_engajamento, destaque, usuario_criacao_id, usuario_ultima_modificacao_id
)
SELECT
  c.id,
  'post-seed-1',
  now() - interval '3 day',
  'Lançamento ERP AviZee Social',
  'Conheça nosso novo módulo de redes sociais integrado ao ERP.',
  'https://instagram.com/p/post-seed-1',
  'feed',
  5400, 4100, 320, 28, 17, 65, 45, 430, 7.95, true,
  (SELECT id FROM first_user), (SELECT id FROM first_user)
FROM contas_seed c
WHERE NOT EXISTS (SELECT 1 FROM public.social_posts WHERE id_externo_post = 'post-seed-1');
