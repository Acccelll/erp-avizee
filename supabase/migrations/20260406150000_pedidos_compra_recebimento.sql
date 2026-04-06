-- Migration: Enhance pedidos_compra for receiving tracking
-- Adds data_entrega_real, frete_valor, condicao_pagamento columns
-- Back-fills legacy status values to new naming convention

-- 1. Add receiving and commercial fields
ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS data_entrega_real date,
  ADD COLUMN IF NOT EXISTS frete_valor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condicao_pagamento text;

-- 2. Back-fill legacy status values to aligned names
UPDATE public.pedidos_compra SET status = 'aguardando_recebimento' WHERE status = 'pendente';
UPDATE public.pedidos_compra SET status = 'parcialmente_recebido'  WHERE status = 'parcial';
UPDATE public.pedidos_compra SET status = 'recebido'               WHERE status = 'concluido';
