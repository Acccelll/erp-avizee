
-- ============================================================
-- Replace permissive "Auth users can CRUD" policies on sensitive
-- financial/banking tables with role-based policies.
-- READ: all authenticated users (needed for ERP UI).
-- WRITE (INSERT/UPDATE/DELETE): only admin, financeiro roles.
-- ============================================================

-- 1. financeiro_lancamentos
DROP POLICY IF EXISTS "Auth users can CRUD financeiro_lancamentos" ON public.financeiro_lancamentos;
CREATE POLICY "Auth users can read financeiro_lancamentos" ON public.financeiro_lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert financeiro_lancamentos" ON public.financeiro_lancamentos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update financeiro_lancamentos" ON public.financeiro_lancamentos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete financeiro_lancamentos" ON public.financeiro_lancamentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

-- 2. caixa_movimentos
DROP POLICY IF EXISTS "Auth users can CRUD caixa_movimentos" ON public.caixa_movimentos;
CREATE POLICY "Auth users can read caixa_movimentos" ON public.caixa_movimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert caixa_movimentos" ON public.caixa_movimentos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update caixa_movimentos" ON public.caixa_movimentos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete caixa_movimentos" ON public.caixa_movimentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

-- 3. contas_bancarias
DROP POLICY IF EXISTS "Auth users can CRUD contas_bancarias" ON public.contas_bancarias;
CREATE POLICY "Auth users can read contas_bancarias" ON public.contas_bancarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert contas_bancarias" ON public.contas_bancarias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update contas_bancarias" ON public.contas_bancarias FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete contas_bancarias" ON public.contas_bancarias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

-- 4. notas_fiscais
DROP POLICY IF EXISTS "Auth users can CRUD notas_fiscais" ON public.notas_fiscais;
CREATE POLICY "Auth users can read notas_fiscais" ON public.notas_fiscais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert notas_fiscais" ON public.notas_fiscais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update notas_fiscais" ON public.notas_fiscais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete notas_fiscais" ON public.notas_fiscais FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

-- 5. notas_fiscais_itens
DROP POLICY IF EXISTS "Auth users can CRUD notas_fiscais_itens" ON public.notas_fiscais_itens;
CREATE POLICY "Auth users can read notas_fiscais_itens" ON public.notas_fiscais_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert notas_fiscais_itens" ON public.notas_fiscais_itens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update notas_fiscais_itens" ON public.notas_fiscais_itens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete notas_fiscais_itens" ON public.notas_fiscais_itens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

-- 6. compras
DROP POLICY IF EXISTS "Auth users can CRUD compras" ON public.compras;
CREATE POLICY "Auth users can read compras" ON public.compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert compras" ON public.compras FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update compras" ON public.compras FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete compras" ON public.compras FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

-- 7. compras_itens
DROP POLICY IF EXISTS "Auth users can CRUD compras_itens" ON public.compras_itens;
CREATE POLICY "Auth users can read compras_itens" ON public.compras_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/financeiro can insert compras_itens" ON public.compras_itens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can update compras_itens" ON public.compras_itens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));
CREATE POLICY "Admin/financeiro can delete compras_itens" ON public.compras_itens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'financeiro'::app_role));

-- 8. estoque_movimentos (admin + estoquista)
DROP POLICY IF EXISTS "Auth users can CRUD estoque_movimentos" ON public.estoque_movimentos;
CREATE POLICY "Auth users can read estoque_movimentos" ON public.estoque_movimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/estoquista can insert estoque_movimentos" ON public.estoque_movimentos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role));
CREATE POLICY "Admin/estoquista can update estoque_movimentos" ON public.estoque_movimentos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role));
CREATE POLICY "Admin/estoquista can delete estoque_movimentos" ON public.estoque_movimentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'estoquista'::app_role));

-- 9. ordens_venda (admin + vendedor)
DROP POLICY IF EXISTS "Auth users can CRUD ordens_venda" ON public.ordens_venda;
CREATE POLICY "Auth users can read ordens_venda" ON public.ordens_venda FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor can insert ordens_venda" ON public.ordens_venda FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can update ordens_venda" ON public.ordens_venda FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can delete ordens_venda" ON public.ordens_venda FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

-- 10. ordens_venda_itens (admin + vendedor)
DROP POLICY IF EXISTS "Auth users can CRUD ordens_venda_itens" ON public.ordens_venda_itens;
CREATE POLICY "Auth users can read ordens_venda_itens" ON public.ordens_venda_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor can insert ordens_venda_itens" ON public.ordens_venda_itens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can update ordens_venda_itens" ON public.ordens_venda_itens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can delete ordens_venda_itens" ON public.ordens_venda_itens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

-- 11. orcamentos (admin + vendedor)
DROP POLICY IF EXISTS "Auth users can CRUD orcamentos" ON public.orcamentos;
CREATE POLICY "Auth users can read orcamentos" ON public.orcamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor can insert orcamentos" ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can update orcamentos" ON public.orcamentos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can delete orcamentos" ON public.orcamentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));

-- 12. orcamentos_itens (admin + vendedor)
DROP POLICY IF EXISTS "Auth users can CRUD orcamentos_itens" ON public.orcamentos_itens;
CREATE POLICY "Auth users can read orcamentos_itens" ON public.orcamentos_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vendedor can insert orcamentos_itens" ON public.orcamentos_itens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can update orcamentos_itens" ON public.orcamentos_itens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
CREATE POLICY "Admin/vendedor can delete orcamentos_itens" ON public.orcamentos_itens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'vendedor'::app_role));
