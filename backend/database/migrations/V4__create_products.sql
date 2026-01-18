-- 11. PRODUCTS
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ean TEXT,
  modelo_ref TEXT,
  marca TEXT, -- Fabricante
  
  -- JSONB columns for structured data
  nfs_data JSONB DEFAULT '[]'::jsonb, -- Array of { codigo: string, revenda: string }
  modelos_data JSONB DEFAULT '[]'::jsonb, -- Array of models with their sub-items
  
  -- Master level assets
  fotos TEXT[] DEFAULT ARRAY[]::TEXT[],
  manual_url TEXT,
  
  -- Master level items
  embalagem JSONB DEFAULT '[]'::jsonb,
  acessorios JSONB DEFAULT '[]'::jsonb, -- Acessorios gerais do produto master
  
  -- Metadata
  estoque_atual INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON produtos FOR UPDATE TO authenticated USING (true);
