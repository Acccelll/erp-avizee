-- ============================================================
-- RLS para tabelas de cadastro: produtos, clientes, fornecedores
-- READ: todos os usuários autenticados
-- WRITE: roles específicas conforme a tabela
-- ============================================================

-- produtos
DROP POLICY IF EXISTS "Auth users can CRUD produtos" ON public.produtos;
CREATE POLICY "Auth users can read produtos"
  ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/estoquista/financeiro can write produtos"
  ON public.produtos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/estoquista/financeiro can update produtos"
  ON public.produtos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin can delete produtos"
  ON public.produtos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- clientes
DROP POLICY IF EXISTS "Auth users can CRUD clientes" ON public.clientes;
CREATE POLICY "Auth users can read clientes"
  ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor/financeiro can write clientes"
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/vendedor/financeiro can update clientes"
  ON public.clientes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin can delete clientes"
  ON public.clientes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- fornecedores
DROP POLICY IF EXISTS "Auth users can CRUD fornecedores" ON public.fornecedores;
CREATE POLICY "Auth users can read fornecedores"
  ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro/estoquista can write fornecedores"
  ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role));
CREATE POLICY "Admin/financeiro/estoquista can update fornecedores"
  ON public.fornecedores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role));
CREATE POLICY "Admin can delete fornecedores"
  ON public.fornecedores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- produtos_fornecedores (tabela de vínculo)
DROP POLICY IF EXISTS "Auth users can CRUD produtos_fornecedores" ON public.produtos_fornecedores;
CREATE POLICY "Auth users can read produtos_fornecedores"
  ON public.produtos_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/estoquista/financeiro can manage produtos_fornecedores"
  ON public.produtos_fornecedores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
