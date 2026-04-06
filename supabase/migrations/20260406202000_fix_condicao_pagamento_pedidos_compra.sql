-- Fix: ensure condicao_pagamento (and companion columns) exist on pedidos_compra.
-- Migration 20260406150000 added these columns but may have been tracked by Supabase
-- without being executed against the live database.  This migration is idempotent
-- (IF NOT EXISTS) and supersedes the column-addition step of that migration.

ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS data_entrega_real    date,
  ADD COLUMN IF NOT EXISTS frete_valor          numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condicao_pagamento   text;
