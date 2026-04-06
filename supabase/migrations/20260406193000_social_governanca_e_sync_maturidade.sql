-- Ajuste de governança do módulo Social: remove acoplamento principal ao perfil financeiro.

DROP POLICY IF EXISTS "Admin/financeiro can manage social_contas" ON public.social_contas;
DROP POLICY IF EXISTS "Admin/financeiro can manage social_metricas_snapshot" ON public.social_metricas_snapshot;
DROP POLICY IF EXISTS "Admin/financeiro can manage social_posts" ON public.social_posts;
DROP POLICY IF EXISTS "Admin/financeiro can manage social_alertas" ON public.social_alertas;
DROP POLICY IF EXISTS "Admin/financeiro can manage social_campanhas" ON public.social_campanhas;

CREATE POLICY "Admin/vendedor can manage social_contas" ON public.social_contas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Admin/vendedor can manage social_metricas_snapshot" ON public.social_metricas_snapshot FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Admin/vendedor can manage social_posts" ON public.social_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Admin/vendedor can manage social_alertas" ON public.social_alertas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Admin/vendedor can manage social_campanhas" ON public.social_campanhas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

CREATE OR REPLACE FUNCTION public.social_sincronizar_manual(_conta_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta record;
  v_prev record;
  v_followers_base integer;
  v_growth integer;
  v_posts integer;
  v_alcance integer;
  v_impressoes integer;
  v_engajamento integer;
  v_taxa numeric(7,4);
  v_tipo_post text;
  v_i integer;
  v_now timestamptz := now();
BEGIN
  FOR v_conta IN
    SELECT id, plataforma, nome_conta, ultima_sincronizacao
    FROM public.social_contas
    WHERE ativo = true AND (_conta_id IS NULL OR id = _conta_id)
  LOOP
    SELECT * INTO v_prev
    FROM public.social_metricas_snapshot
    WHERE conta_id = v_conta.id
    ORDER BY data_referencia DESC
    LIMIT 1;

    v_followers_base := COALESCE(v_prev.seguidores_total, CASE WHEN v_conta.plataforma = 'instagram_business' THEN 4200 ELSE 1800 END);

    IF v_conta.plataforma = 'instagram_business' THEN
      v_growth := 12 + floor(random() * 44)::int;
      v_posts := 1 + floor(random() * 4)::int;
      v_alcance := 3500 + floor(random() * 5000)::int;
      v_impressoes := v_alcance + (900 + floor(random() * 1800)::int);
      v_engajamento := 180 + floor(random() * 430)::int;
      v_taxa := ROUND(((v_engajamento::numeric / GREATEST(v_alcance, 1)) * 100)::numeric, 4);
    ELSE
      v_growth := 5 + floor(random() * 16)::int;
      v_posts := 1 + floor(random() * 3)::int;
      v_alcance := 1800 + floor(random() * 2500)::int;
      v_impressoes := v_alcance + (350 + floor(random() * 1200)::int);
      v_engajamento := 70 + floor(random() * 220)::int;
      v_taxa := ROUND(((v_engajamento::numeric / GREATEST(v_alcance, 1)) * 100)::numeric, 4);
    END IF;

    INSERT INTO public.social_metricas_snapshot (
      conta_id, data_referencia, seguidores_total, seguidores_novos, impressoes, alcance,
      visitas_perfil, cliques_link, engajamento_total, taxa_engajamento, quantidade_posts_periodo,
      observacoes, usuario_criacao_id
    ) VALUES (
      v_conta.id,
      current_date,
      v_followers_base + v_growth,
      v_growth,
      v_impressoes,
      v_alcance,
      floor(v_alcance * 0.04),
      floor(v_alcance * 0.015),
      v_engajamento,
      v_taxa,
      v_posts,
      'Snapshot mockado com cenário realista por plataforma.',
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

    FOR v_i IN 1..v_posts LOOP
      v_tipo_post := CASE
        WHEN v_conta.plataforma = 'instagram_business' AND random() < 0.45 THEN 'reels'
        WHEN v_conta.plataforma = 'linkedin_page' AND random() < 0.35 THEN 'artigo'
        WHEN random() < 0.25 THEN 'video'
        WHEN random() < 0.2 THEN 'carousel'
        ELSE 'feed'
      END;

      INSERT INTO public.social_posts (
        conta_id, id_externo_post, data_publicacao, titulo_legenda, url_post, tipo_post,
        impressoes, alcance, curtidas, comentarios, compartilhamentos, salvamentos, cliques,
        engajamento_total, taxa_engajamento, destaque, usuario_criacao_id, usuario_ultima_modificacao_id
      ) VALUES (
        v_conta.id,
        format('sync-%s-%s-%s', v_conta.id, to_char(v_now, 'YYYYMMDD'), v_i),
        v_now - make_interval(hours => (v_i * 2)),
        format('%s • Conteúdo sincronizado #%s', v_conta.nome_conta, v_i),
        NULL,
        v_tipo_post,
        floor(v_impressoes / GREATEST(v_posts,1)),
        floor(v_alcance / GREATEST(v_posts,1)),
        floor(v_engajamento * 0.55 / GREATEST(v_posts,1)),
        floor(v_engajamento * 0.18 / GREATEST(v_posts,1)),
        floor(v_engajamento * 0.11 / GREATEST(v_posts,1)),
        floor(v_engajamento * 0.09 / GREATEST(v_posts,1)),
        floor(v_engajamento * 0.07 / GREATEST(v_posts,1)),
        floor(v_engajamento / GREATEST(v_posts,1)),
        ROUND((v_taxa + ((random() * 1.1) - 0.55))::numeric, 4),
        (random() > 0.86),
        auth.uid(),
        auth.uid()
      )
      ON CONFLICT (conta_id, id_externo_post) DO NOTHING;
    END LOOP;

    DELETE FROM public.social_alertas
    WHERE conta_id = v_conta.id
      AND data_cadastro::date = current_date
      AND tipo_alerta IN ('engajamento_baixo', 'crescimento_baixo', 'sincronizacao_desatualizada', 'destaque_acima_media', 'sem_publicacao');

    IF (v_now - COALESCE(v_conta.ultima_sincronizacao, v_now - interval '72 hour')) > interval '48 hour' THEN
      INSERT INTO public.social_alertas (conta_id, tipo_alerta, titulo, descricao, severidade, data_referencia, usuario_criacao_id)
      VALUES (v_conta.id, 'sincronizacao_desatualizada', 'Sincronização desatualizada', 'Conta sem sincronização nas últimas 48 horas.', 'alta', current_date, auth.uid());
    END IF;

    IF v_posts = 0 THEN
      INSERT INTO public.social_alertas (conta_id, tipo_alerta, titulo, descricao, severidade, data_referencia, usuario_criacao_id)
      VALUES (v_conta.id, 'sem_publicacao', 'Muitos dias sem publicar', 'Nenhuma publicação foi identificada no ciclo atual.', 'alta', current_date, auth.uid());
    END IF;

    IF v_taxa < CASE WHEN v_conta.plataforma = 'instagram_business' THEN 2.8 ELSE 1.0 END THEN
      INSERT INTO public.social_alertas (conta_id, tipo_alerta, titulo, descricao, severidade, data_referencia, usuario_criacao_id)
      VALUES (v_conta.id, 'engajamento_baixo', 'Engajamento abaixo da média', 'Taxa de engajamento ficou abaixo do patamar esperado da rede.', 'media', current_date, auth.uid());
    END IF;

    IF v_growth < CASE WHEN v_conta.plataforma = 'instagram_business' THEN 15 ELSE 7 END THEN
      INSERT INTO public.social_alertas (conta_id, tipo_alerta, titulo, descricao, severidade, data_referencia, usuario_criacao_id)
      VALUES (v_conta.id, 'crescimento_baixo', 'Crescimento abaixo do padrão', 'Seguidores novos abaixo do padrão recente.', 'media', current_date, auth.uid());
    END IF;

    IF v_taxa > CASE WHEN v_conta.plataforma = 'instagram_business' THEN 8.0 ELSE 4.0 END THEN
      INSERT INTO public.social_alertas (conta_id, tipo_alerta, titulo, descricao, severidade, data_referencia, usuario_criacao_id)
      VALUES (v_conta.id, 'destaque_acima_media', 'Post com desempenho acima da média', 'Detectado desempenho significativamente acima do histórico esperado.', 'baixa', current_date, auth.uid());
    END IF;

    UPDATE public.social_contas
    SET ultima_sincronizacao = v_now,
        usuario_ultima_modificacao_id = auth.uid()
    WHERE id = v_conta.id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'conta_id', _conta_id,
    'sincronizado_em', now(),
    'message', 'Sincronização manual executada com cenário mock operacional.'
  );
END;
$$;
