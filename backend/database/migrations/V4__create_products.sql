-- 11. PRODUCTS
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_nf TEXT,
  ean TEXT,
  modelo_ref TEXT,
  modelo_fabricante TEXT[], -- Array of strings
  acessorios TEXT[], -- Array of strings
  estoque_atual INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON produtos FOR UPDATE TO authenticated USING (true);
