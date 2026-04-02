-- Add missing enum values to status_pedido
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'pendente';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'aguardando_aprovacao';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'em_analise';

-- Add desconto_percentual column to precos_especiais
ALTER TABLE public.precos_especiais ADD COLUMN IF NOT EXISTS desconto_percentual numeric DEFAULT 0;

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_financeiro_status_vencimento ON public.financeiro_lancamentos (status, data_vencimento) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON public.orcamentos (status) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_ativo_estoque ON public.produtos (ativo, estoque_minimo) WHERE ativo = true AND estoque_minimo > 0;
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON public.notas_fiscais (status) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_compras_status ON public.compras (status) WHERE ativo = true;

-- Fix search_path on database functions
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ SELECT pgmq.send(queue_name, payload); $function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ SELECT pgmq.delete(queue_name, message_id); $function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ SELECT msg_id, read_ct, message FROM pgmq.read(queue_name, vt, batch_size); $function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$function$;