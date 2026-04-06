-- Expand cotacoes_compra status constraint to support full approval workflow
-- Adds: convertida (already used in code), aguardando_aprovacao, aprovada, rejeitada

ALTER TABLE public.cotacoes_compra
  DROP CONSTRAINT IF EXISTS cotacoes_compra_status_check;

ALTER TABLE public.cotacoes_compra
  ADD CONSTRAINT cotacoes_compra_status_check
  CHECK (status IN (
    'aberta',
    'em_analise',
    'aguardando_aprovacao',
    'aprovada',
    'finalizada',
    'convertida',
    'rejeitada',
    'cancelada'
  ));
