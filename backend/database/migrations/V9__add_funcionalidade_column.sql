ALTER TABLE produtos ADD COLUMN IF NOT EXISTS funcionalidade JSONB DEFAULT '[]'::jsonb;
