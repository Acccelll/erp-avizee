-- Migration: Suporte a Faturamento Histórico
-- Adiciona campos para identificar origem de importação e flag de somente consulta.

ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'operacional';
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS somente_consulta BOOLEAN DEFAULT false;

-- Comentários
COMMENT ON COLUMN public.notas_fiscais.origem IS 'Indica a fonte da nota: operacional, importacao_historica, migracao_xml';
COMMENT ON COLUMN public.notas_fiscais.somente_consulta IS 'Se true, a nota não gera movimentações automáticas de estoque ou financeiro.';

-- Índice para busca por origem
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_origem ON public.notas_fiscais(origem);
