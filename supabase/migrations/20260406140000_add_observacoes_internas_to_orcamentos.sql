-- Add internal observations field to orcamentos
-- This field is for internal use only and must never be exposed to clients
-- (not in PDF, public link, or any client-facing output)
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;
