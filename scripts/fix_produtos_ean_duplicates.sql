-- Corrige duplicidade de EAN na tabela produtos
-- 1) remove registros duplicados mantendo o mais recente por EAN
-- 2) cria UNIQUE(ean) para impedir novos duplicados

BEGIN;

-- Auditoria antes da limpeza
SELECT
  ean,
  COUNT(*) AS total
FROM public.produtos
WHERE NULLIF(TRIM(ean), '') IS NOT NULL
GROUP BY ean
HAVING COUNT(*) > 1
ORDER BY total DESC, ean;

-- Remove duplicados, mantendo apenas 1 linha por EAN (a mais recente)
WITH ranked AS (
  SELECT
    id,
    ean,
    ROW_NUMBER() OVER (
      PARTITION BY ean
      ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.produtos
  WHERE NULLIF(TRIM(ean), '') IS NOT NULL
)
DELETE FROM public.produtos p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- Auditoria após a limpeza (deve retornar zero linhas)
SELECT
  ean,
  COUNT(*) AS total
FROM public.produtos
WHERE NULLIF(TRIM(ean), '') IS NOT NULL
GROUP BY ean
HAVING COUNT(*) > 1
ORDER BY total DESC, ean;

-- Garante UNIQUE(ean)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'produtos_ean_key'
      AND conrelid = 'public.produtos'::regclass
  ) THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT produtos_ean_key UNIQUE (ean);
  END IF;
END $$;

COMMIT;
