-- =============================================================================
-- V10: Adicionar suporte a imagens base64 no sistema
--   a) Fotos de etiquetas (base64) na tabela recebimentos + dados do wizard
--   b) Imagens separadas por tipo na tabela produtos
-- Execute este arquivo no Supabase SQL Editor para bancos já existentes.
-- =============================================================================

-- ----------------------------------------------------------------
-- RECEBIMENTOS: fotos de etiquetas e dados do wizard físico
-- ----------------------------------------------------------------

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

-- ----------------------------------------------------------------
-- PRODUTOS: imagens separadas por tipo (base64 data URLs)
-- ----------------------------------------------------------------

-- 4. Etiqueta Procel como array de base64
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS etiqueta_procel TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 5. Fotos do kit de acessórios como array de base64
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS kit_acessorio TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.produtos.fotos IS
  'Fotos principais do produto (base64 data URLs).';

COMMENT ON COLUMN public.produtos.etiqueta_procel IS
  'Fotos das etiquetas Procel do produto (base64 data URLs).';

COMMENT ON COLUMN public.produtos.kit_acessorio IS
  'Fotos do kit de acessórios do produto (base64 data URLs).';

