-- Auto-generate numero for pedidos_compra when not provided.
-- The numero column is NOT NULL without a default, causing INSERTs
-- from the frontend (which omit the field) to fail with a NOT NULL
-- constraint violation.
--
-- Strategy: create a sequence + BEFORE INSERT trigger so that any
-- INSERT that leaves numero NULL or blank receives an auto-generated
-- value in the format 'PC-000001'.  Explicit values are preserved
-- as-is.  The BEFORE INSERT trigger fires before constraint checks,
-- so the NOT NULL constraint remains enforced.

CREATE SEQUENCE IF NOT EXISTS public.pedidos_compra_numero_seq;

CREATE OR REPLACE FUNCTION public.fn_pedidos_compra_auto_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'PC-' || LPAD(nextval('public.pedidos_compra_numero_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedidos_compra_auto_numero ON public.pedidos_compra;

CREATE TRIGGER trg_pedidos_compra_auto_numero
  BEFORE INSERT ON public.pedidos_compra
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pedidos_compra_auto_numero();

NOTIFY pgrst, 'reload schema';
