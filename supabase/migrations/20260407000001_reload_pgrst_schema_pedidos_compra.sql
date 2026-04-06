-- Force PostgREST to reload its schema cache.
--
-- Migrations 20260406150000 and 20260406202000 added the columns
-- data_entrega_real, frete_valor, and condicao_pagamento to
-- pedidos_compra, but the PostgREST schema cache may not have
-- been refreshed automatically, producing PGRST204 errors when
-- those columns are included in INSERT/UPDATE payloads.
--
-- This migration is idempotent: it re-adds the columns with
-- IF NOT EXISTS and then signals PostgREST to reload so the REST
-- API reflects the current schema immediately.

ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS data_entrega_real  date,
  ADD COLUMN IF NOT EXISTS frete_valor        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condicao_pagamento text;

-- Signal PostgREST to rebuild its schema cache.
-- See: https://postgrest.org/en/stable/references/api/schema_cache.html
NOTIFY pgrst, 'reload schema';
