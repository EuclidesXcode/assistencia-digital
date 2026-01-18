-- Fix Missing Columns in Produtos (Comprehensive Fix)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS embalagem JSONB DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS acessorios JSONB DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS nfs_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estetica JSONB DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS funcional JSONB DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS funcionalidade JSONB DEFAULT '[]'::jsonb;

-- Force schema cache reload (Supabase specific, if supported via SQL usually requires restart or UI action, but adding a comment sometimes triggers update)
COMMENT ON TABLE produtos IS 'Tabela de produtos (Schema Updated)';

-- Enforce Unique EAN
ALTER TABLE produtos ADD CONSTRAINT produtos_ean_key UNIQUE (ean);
