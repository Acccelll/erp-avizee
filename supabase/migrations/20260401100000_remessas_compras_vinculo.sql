-- Adicionar vínculos de pedidos de compra e notas fiscais às remessas
ALTER TABLE public.remessas
  ADD COLUMN pedido_compra_id UUID REFERENCES public.pedidos_compra(id) ON DELETE SET NULL,
  ADD COLUMN nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL;

-- Comentários nas colunas
COMMENT ON COLUMN public.remessas.pedido_compra_id IS 'Vínculo opcional com um pedido de compra para rastreio de entrada.';
COMMENT ON COLUMN public.remessas.nota_fiscal_id IS 'Vínculo opcional com uma nota fiscal (entrada ou saída) para rastreio.';
