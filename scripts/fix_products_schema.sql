
-- Adicionar colunas faltantes na tabela 'produtos'
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS fabricante TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS manual_url TEXT;

-- Garantir que não existe constraint UNIQUE em EAN (reforço)
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_ean_key;
