-- Ensure all extended columns on pedidos_compra exist and are visible
-- to PostgREST.  Previous migrations added these columns but the schema
-- cache reload may not have been picked up.  This migration is the most
-- recent one, so it runs last and guarantees the columns are present
-- before the NOTIFY fires.

ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS data_entrega_real  date,
  ADD COLUMN IF NOT EXISTS frete_valor        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condicao_pagamento text;

-- Force PostgREST to rebuild its schema cache using both the NOTIFY
-- statement and the equivalent pg_notify() function call, covering all
-- Supabase/PostgREST configurations.
SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';
