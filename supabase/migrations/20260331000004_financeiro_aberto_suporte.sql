-- Migration: Suporte a Importação de Financeiro em Aberto
-- Adiciona campos para identificar origem de abertura e vínculo com lote de migração.

ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'operacional';
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES public.importacao_lotes(id);

-- Comentários
COMMENT ON COLUMN public.financeiro_lancamentos.origem IS 'Indica a fonte do lançamento: operacional, abertura_financeiro';
COMMENT ON COLUMN public.financeiro_lancamentos.lote_id IS 'Vínculo opcional com o lote de importação de dados legados.';

-- Índice para busca por lote
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_lote ON public.financeiro_lancamentos(lote_id);
