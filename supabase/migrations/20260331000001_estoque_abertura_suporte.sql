-- Migration: Suporte a Abertura de Estoque
-- Adiciona o tipo 'abertura' nas origens de movimentação de estoque caso exista check constraint restrictiva.
-- Em Supabase/PostgreSQL, se for uma coluna TEXT simples, não precisa de alteração.
-- Mas vamos garantir que o comentário explique a nova origem.

COMMENT ON COLUMN public.estoque_movimentos.documento_tipo IS 'Origem do movimento: manual, fiscal, compra, venda, ajuste, abertura';

-- Adicionar campo data_base para o lote de importação (útil para retroagir saldos se necessário)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='importacao_lotes' AND column_name='data_base') THEN
        ALTER TABLE public.importacao_lotes ADD COLUMN data_base DATE;
    END IF;
END $$;
