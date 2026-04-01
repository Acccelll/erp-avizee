-- Permite que usuários anônimos atualizem o status de orçamentos via public_token
CREATE POLICY "Anon can approve or reject orcamento by token"
ON public.orcamentos
FOR UPDATE
TO anon
USING (public_token IS NOT NULL AND ativo = true)
WITH CHECK (status IN ('aprovado', 'rejeitado'));
