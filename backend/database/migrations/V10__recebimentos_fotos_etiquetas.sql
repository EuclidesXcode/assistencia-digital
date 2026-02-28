-- =============================================================================
-- V10: Adicionar suporte a fotos de etiquetas (base64) na tabela recebimentos
--      e colunas de recebimento físico.
-- Execute este arquivo no Supabase SQL Editor para bancos já existentes.
-- =============================================================================

-- 1. Fotos das etiquetas como JSONB base64
--    Estrutura: { "CODIGO_UNICO": "data:image/jpeg;base64,...", "VISTORIA_REVENDA": "...", "SAT": "..." }
ALTER TABLE public.recebimentos
  ADD COLUMN IF NOT EXISTS fotos_etiquetas JSONB DEFAULT '{}'::jsonb;

-- 2. Dados de recebimento físico (preenchidos pelo wizard de recebimento)
ALTER TABLE public.recebimentos
  ADD COLUMN IF NOT EXISTS lote_id       INTEGER,
  ADD COLUMN IF NOT EXISTS recebido_por  TEXT,
  ADD COLUMN IF NOT EXISTS codigo_unico  TEXT,
  ADD COLUMN IF NOT EXISTS numero_serie  TEXT,
  ADD COLUMN IF NOT EXISTS com_nf        BOOLEAN DEFAULT true;

-- 3. Índice para buscas por lote
CREATE INDEX IF NOT EXISTS idx_recebimentos_lote ON public.recebimentos(lote_id);

COMMENT ON COLUMN public.recebimentos.fotos_etiquetas IS
  'Fotos das etiquetas em base64. Chaves: CODIGO_UNICO, VISTORIA_REVENDA, SAT.';

COMMENT ON COLUMN public.recebimentos.lote_id IS
  'Número do lote de recebimento físico.';
