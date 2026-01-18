-- Fix Missing Columns in Produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estetica JSONB DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS funcional JSONB DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS funcionalidade JSONB DEFAULT '[]'::jsonb;
