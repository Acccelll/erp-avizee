
-- Drop the permissive INSERT policy that allows any authenticated user to inject arbitrary audit logs
DROP POLICY IF EXISTS "Auth users can insert audit logs" ON public.auditoria_logs;

-- Create a restricted INSERT policy that forces usuario_id to match the authenticated user
CREATE POLICY "Auth users can insert own audit logs"
  ON public.auditoria_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());
