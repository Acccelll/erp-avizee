
-- Add frete_valor to notas_fiscais
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS frete_valor numeric DEFAULT 0;

-- Add tax fields to notas_fiscais
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS icms_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS ipi_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS pis_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS cofins_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS icms_st_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS desconto_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS outras_despesas numeric DEFAULT 0;

-- Add conta_contabil_id per item on notas_fiscais_itens
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS conta_contabil_id uuid REFERENCES public.contas_contabeis(id);

-- Add tax fields per item
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS icms_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS ipi_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS pis_valor numeric DEFAULT 0;
ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS cofins_valor numeric DEFAULT 0;
