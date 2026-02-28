-- Permite repetir EAN na tabela produtos.
-- Cada salvamento passa a gerar um registro independente, sem sobrescrever o anterior.

BEGIN;

ALTER TABLE public.produtos
  DROP CONSTRAINT IF EXISTS produtos_ean_key;

DROP INDEX IF EXISTS public.produtos_ean_key;

CREATE INDEX IF NOT EXISTS idx_produtos_ean_created_at
  ON public.produtos (ean, created_at DESC);

COMMIT;
