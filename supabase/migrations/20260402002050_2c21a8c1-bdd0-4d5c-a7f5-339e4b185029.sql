-- ============================================
-- Tighten RLS on 11 overly-permissive tables
-- ============================================

-- 1. clientes: read all, write admin/vendedor
DROP POLICY IF EXISTS "Auth users can CRUD clientes" ON public.clientes;
CREATE POLICY "Auth users can read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));

-- 2. fornecedores: read all, write admin/financeiro
DROP POLICY IF EXISTS "Auth users can CRUD fornecedores" ON public.fornecedores;
CREATE POLICY "Auth users can read fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert fornecedores" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update fornecedores" ON public.fornecedores FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete fornecedores" ON public.fornecedores FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

-- 3. bancos: read all, write admin/financeiro
DROP POLICY IF EXISTS "Auth users can CRUD bancos" ON public.bancos;
CREATE POLICY "Auth users can read bancos" ON public.bancos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert bancos" ON public.bancos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update bancos" ON public.bancos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete bancos" ON public.bancos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

-- 4. contas_contabeis: read all, write admin/financeiro
DROP POLICY IF EXISTS "Auth users can CRUD contas_contabeis" ON public.contas_contabeis;
CREATE POLICY "Auth users can read contas_contabeis" ON public.contas_contabeis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert contas_contabeis" ON public.contas_contabeis FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update contas_contabeis" ON public.contas_contabeis FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete contas_contabeis" ON public.contas_contabeis FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

-- 5. formas_pagamento: read all, write admin/financeiro
DROP POLICY IF EXISTS "Auth users can CRUD formas_pagamento" ON public.formas_pagamento;
CREATE POLICY "Auth users can read formas_pagamento" ON public.formas_pagamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert formas_pagamento" ON public.formas_pagamento FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update formas_pagamento" ON public.formas_pagamento FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete formas_pagamento" ON public.formas_pagamento FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

-- 6. grupos_economicos: read all, write admin
DROP POLICY IF EXISTS "Auth users can CRUD grupos_economicos" ON public.grupos_economicos;
CREATE POLICY "Auth users can read grupos_economicos" ON public.grupos_economicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert grupos_economicos" ON public.grupos_economicos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update grupos_economicos" ON public.grupos_economicos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete grupos_economicos" ON public.grupos_economicos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. grupos_produto: read all, write admin/estoquista
DROP POLICY IF EXISTS "Authenticated users can delete grupos" ON public.grupos_produto;
DROP POLICY IF EXISTS "Authenticated users can insert grupos" ON public.grupos_produto;
DROP POLICY IF EXISTS "Authenticated users can read grupos" ON public.grupos_produto;
DROP POLICY IF EXISTS "Authenticated users can update grupos" ON public.grupos_produto;
CREATE POLICY "Auth users can read grupos_produto" ON public.grupos_produto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/estoquista can insert grupos_produto" ON public.grupos_produto FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'estoquista'::app_role));
CREATE POLICY "Admin/estoquista can update grupos_produto" ON public.grupos_produto FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'estoquista'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'estoquista'::app_role));
CREATE POLICY "Admin/estoquista can delete grupos_produto" ON public.grupos_produto FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'estoquista'::app_role));

-- 8. cliente_transportadoras: read all, write admin/vendedor
DROP POLICY IF EXISTS "Auth users can CRUD cliente_transportadoras" ON public.cliente_transportadoras;
CREATE POLICY "Auth users can read cliente_transportadoras" ON public.cliente_transportadoras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor can insert cliente_transportadoras" ON public.cliente_transportadoras FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can update cliente_transportadoras" ON public.cliente_transportadoras FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can delete cliente_transportadoras" ON public.cliente_transportadoras FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));

-- 9. cliente_registros_comunicacao: read all, write admin/vendedor
DROP POLICY IF EXISTS "Auth users can CRUD cliente_registros_comunicacao" ON public.cliente_registros_comunicacao;
CREATE POLICY "Auth users can read cliente_registros_comunicacao" ON public.cliente_registros_comunicacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor can insert cliente_registros_comunicacao" ON public.cliente_registros_comunicacao FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can update cliente_registros_comunicacao" ON public.cliente_registros_comunicacao FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can delete cliente_registros_comunicacao" ON public.cliente_registros_comunicacao FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role));

-- 10. importacao_logs: read all, write admin
DROP POLICY IF EXISTS "Auth users can CRUD importacao_logs" ON public.importacao_logs;
CREATE POLICY "Auth users can read importacao_logs" ON public.importacao_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert importacao_logs" ON public.importacao_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update importacao_logs" ON public.importacao_logs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete importacao_logs" ON public.importacao_logs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. importacao_lotes: read all, write admin
DROP POLICY IF EXISTS "Auth users can CRUD importacao_lotes" ON public.importacao_lotes;
CREATE POLICY "Auth users can read importacao_lotes" ON public.importacao_lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert importacao_lotes" ON public.importacao_lotes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update importacao_lotes" ON public.importacao_lotes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete importacao_lotes" ON public.importacao_lotes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- Storage RLS policies for dbavizee bucket
-- ============================================
CREATE POLICY "Authenticated users can read storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'dbavizee');
CREATE POLICY "Admin can upload to storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dbavizee' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update storage" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dbavizee' AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (bucket_id = 'dbavizee' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete from storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dbavizee' AND has_role(auth.uid(), 'admin'::app_role));