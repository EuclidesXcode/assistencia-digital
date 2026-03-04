-- Permite repetir EAN na tabela produtos.
-- Cada salvamento passa a gerar um registro independente, sem sobrescrever o anterior.
-- Remove qualquer UNIQUE constraint/index ligado ao campo ean, mesmo com nome diferente.

BEGIN;

DO $$
DECLARE
  constraint_record RECORD;
  index_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'produtos'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%(ean)%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS %I',
      constraint_record.conname
    );
  END LOOP;

  FOR index_record IN
    SELECT idx.indexname
    FROM pg_indexes idx
    WHERE idx.schemaname = 'public'
      AND idx.tablename = 'produtos'
      AND idx.indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND idx.indexdef ILIKE '%(ean%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', index_record.indexname);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_produtos_ean_created_at
  ON public.produtos (ean, created_at DESC);

COMMIT;
