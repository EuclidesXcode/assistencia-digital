-- Ajusta a tabela public.recebimentos para suportar o wizard de recebimento
-- sem criar tabela separada para lotes.
--
-- Importante:
-- - Esta migracao e aditiva.
-- - Ela reutiliza a tabela public.recebimentos existente.
-- - Ela nao conecta a UI automaticamente ao banco.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Novas colunas na tabela de recebimentos
-- ---------------------------------------------------------------------------
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS tipo_recebimento TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS lote_numero BIGINT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS lote_status TEXT DEFAULT 'aberto';
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS lote_criado_por TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS lote_iniciado_em TIMESTAMPTZ;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS lote_finalizado_em TIMESTAMPTZ;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS numero_item INTEGER;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS recebido_por TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS codigo_unico TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS numero_serie TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS modelo_referencia TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS fotos_etiquetas JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS etiquetas_missing JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.recebimentos ADD COLUMN IF NOT EXISTS pendencias JSONB DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Constraints
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recebimentos_tipo_recebimento_chk'
      AND conrelid = 'public.recebimentos'::regclass
  ) THEN
    ALTER TABLE public.recebimentos
      ADD CONSTRAINT recebimentos_tipo_recebimento_chk
      CHECK (
        tipo_recebimento IS NULL
        OR tipo_recebimento IN ('com_nf', 'sem_nf')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recebimentos_lote_status_chk'
      AND conrelid = 'public.recebimentos'::regclass
  ) THEN
    ALTER TABLE public.recebimentos
      ADD CONSTRAINT recebimentos_lote_status_chk
      CHECK (
        lote_status IS NULL
        OR lote_status IN ('aberto', 'finalizado')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recebimentos_codigo_nf_por_tipo_chk'
      AND conrelid = 'public.recebimentos'::regclass
  ) THEN
    ALTER TABLE public.recebimentos
      ADD CONSTRAINT recebimentos_codigo_nf_por_tipo_chk
      CHECK (
        tipo_recebimento IS NULL
        OR (
          tipo_recebimento = 'com_nf'
          AND NULLIF(BTRIM(codigo_nf), '') IS NOT NULL
        )
        OR (
          tipo_recebimento = 'sem_nf'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recebimentos_fotos_etiquetas_json_chk'
      AND conrelid = 'public.recebimentos'::regclass
  ) THEN
    ALTER TABLE public.recebimentos
      ADD CONSTRAINT recebimentos_fotos_etiquetas_json_chk
      CHECK (jsonb_typeof(fotos_etiquetas) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recebimentos_etiquetas_missing_json_chk'
      AND conrelid = 'public.recebimentos'::regclass
  ) THEN
    ALTER TABLE public.recebimentos
      ADD CONSTRAINT recebimentos_etiquetas_missing_json_chk
      CHECK (jsonb_typeof(etiquetas_missing) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recebimentos_pendencias_json_chk'
      AND conrelid = 'public.recebimentos'::regclass
  ) THEN
    ALTER TABLE public.recebimentos
      ADD CONSTRAINT recebimentos_pendencias_json_chk
      CHECK (jsonb_typeof(pendencias) = 'array');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Comments
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.recebimentos.tipo_recebimento IS 'com_nf ou sem_nf.';
COMMENT ON COLUMN public.recebimentos.lote_numero IS 'Numero visivel do lote no wizard.';
COMMENT ON COLUMN public.recebimentos.lote_status IS 'aberto ou finalizado.';
COMMENT ON COLUMN public.recebimentos.lote_criado_por IS 'Usuario que iniciou o lote.';
COMMENT ON COLUMN public.recebimentos.numero_item IS 'Numero sequencial do item dentro do lote.';
COMMENT ON COLUMN public.recebimentos.recebido_por IS 'Usuario que efetuou o recebimento.';
COMMENT ON COLUMN public.recebimentos.codigo_unico IS 'Codigo unico capturado na etiqueta.';
COMMENT ON COLUMN public.recebimentos.numero_serie IS 'Numero de serie do produto.';
COMMENT ON COLUMN public.recebimentos.modelo_referencia IS 'Modelo referencia usado na tela de recebimento.';
COMMENT ON COLUMN public.recebimentos.finalizado_em IS 'Data/hora de finalizacao do item.';
COMMENT ON COLUMN public.recebimentos.fotos_etiquetas IS 'JSONB com fotos das etiquetas: codigo_unico, vistoria_revenda, sat.';
COMMENT ON COLUMN public.recebimentos.etiquetas_missing IS 'JSONB com flags de etiquetas indisponiveis.';
COMMENT ON COLUMN public.recebimentos.pendencias IS 'JSONB array com pendencias do recebimento.';

-- ---------------------------------------------------------------------------
-- 4. Backfill basico para dados legados
-- ---------------------------------------------------------------------------
UPDATE public.recebimentos
SET tipo_recebimento = CASE
  WHEN NULLIF(BTRIM(codigo_nf), '') IS NOT NULL THEN 'com_nf'
  ELSE 'sem_nf'
END
WHERE tipo_recebimento IS NULL;

UPDATE public.recebimentos
SET recebido_por = analisado_por
WHERE recebido_por IS NULL
  AND NULLIF(BTRIM(analisado_por), '') IS NOT NULL;

UPDATE public.recebimentos
SET modelo_referencia = modelo_fabricante
WHERE modelo_referencia IS NULL
  AND NULLIF(BTRIM(modelo_fabricante), '') IS NOT NULL;

UPDATE public.recebimentos
SET data_recebimento = data
WHERE data_recebimento IS NULL
  AND data IS NOT NULL;

UPDATE public.recebimentos
SET finalizado_em = data_recebimento
WHERE finalizado_em IS NULL
  AND data_recebimento IS NOT NULL
  AND status IN ('concluido', 'recebido');

UPDATE public.recebimentos
SET lote_status = CASE
  WHEN status IN ('concluido', 'recebido') THEN 'finalizado'
  ELSE COALESCE(lote_status, 'aberto')
END
WHERE lote_status IS NULL
   OR lote_status NOT IN ('aberto', 'finalizado');

UPDATE public.recebimentos
SET lote_iniciado_em = created_at
WHERE lote_iniciado_em IS NULL
  AND created_at IS NOT NULL;

UPDATE public.recebimentos
SET fotos_etiquetas = '{}'::jsonb
WHERE fotos_etiquetas IS NULL;

UPDATE public.recebimentos
SET etiquetas_missing = '{}'::jsonb
WHERE etiquetas_missing IS NULL;

UPDATE public.recebimentos
SET pendencias = '[]'::jsonb
WHERE pendencias IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Indices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_recebimentos_tipo_recebimento
  ON public.recebimentos(tipo_recebimento);

CREATE INDEX IF NOT EXISTS idx_recebimentos_lote_numero
  ON public.recebimentos(lote_numero);

CREATE INDEX IF NOT EXISTS idx_recebimentos_lote_status
  ON public.recebimentos(lote_status);

CREATE INDEX IF NOT EXISTS idx_recebimentos_codigo_nf
  ON public.recebimentos(codigo_nf);

CREATE INDEX IF NOT EXISTS idx_recebimentos_codigo_unico
  ON public.recebimentos(codigo_unico);

CREATE INDEX IF NOT EXISTS idx_recebimentos_numero_serie
  ON public.recebimentos(numero_serie);

CREATE INDEX IF NOT EXISTS idx_recebimentos_data_recebimento
  ON public.recebimentos(data_recebimento);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recebimentos_lote_item_unq
  ON public.recebimentos(lote_numero, numero_item)
  WHERE lote_numero IS NOT NULL
    AND numero_item IS NOT NULL;

COMMIT;
