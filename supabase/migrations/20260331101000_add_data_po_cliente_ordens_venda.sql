ALTER TABLE public.ordens_venda
  ADD COLUMN IF NOT EXISTS data_po_cliente DATE;
