-- 12. ORCAMENTOS
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  analisado_por TEXT, -- References user name or ID
  codigo_nf TEXT,
  modelo_fabricante TEXT,
  ean TEXT,
  nf TEXT,
  marca TEXT, -- from OrcamentoService filter
  status TEXT CHECK (status IN ('pendente', 'em_analise', 'concluido')) DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON orcamentos FOR ALL TO authenticated USING (true);


-- 13. PRE_ANALISE
CREATE TABLE IF NOT EXISTS pre_analise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT,
  modelo TEXT,
  ean TEXT,
  status TEXT CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'reprovado')) DEFAULT 'pendente',
  analisado_por TEXT,
  data_analise TIMESTAMP WITH TIME ZONE,
  -- Additional fields for PreAnaliseProduto interface
  recebido_por TEXT,
  codigo_nf TEXT,
  modelo_ref TEXT,
  gtin TEXT,
  nf_receb TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE pre_analise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON pre_analise FOR ALL TO authenticated USING (true);


-- 14. NFE_XMLS (Stored separate from nota mostly for file tracking, but mapped to Nota interface)
CREATE TABLE IF NOT EXISTS nfe_xmls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT UNIQUE NOT NULL,
  numero TEXT,
  emissao TIMESTAMP WITH TIME ZONE,
  itens INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('PENDENTE', 'PARCIAL', 'DIVERGENTE', 'CONFERIDA', 'processada', 'erro')) DEFAULT 'PENDENTE',
  xml_data TEXT, -- Optional storage of raw XML content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE nfe_xmls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON nfe_xmls FOR ALL TO authenticated USING (true);


-- 15. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- specific user or null for global?
  global BOOLEAN DEFAULT FALSE, -- if true, visible to all (or filtered by permission)
  type TEXT CHECK (type IN ('orcamento', 'recebimento', 'pre-analise', 'nfe', 'alerta', 'sucesso', 'cadastro')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  permission TEXT, -- detailed permission check
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/update for own notifications" ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id OR global = true);


-- 16. RECEBIMENTOS
CREATE TABLE IF NOT EXISTS recebimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  analisado_por TEXT,
  codigo_nf TEXT,
  modelo_fabricante TEXT,
  ean TEXT,
  nf TEXT,
  status TEXT CHECK (status IN ('aguardando', 'em_processo', 'concluido', 'recebido')) DEFAULT 'aguardando',
  data_recebimento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON recebimentos FOR ALL TO authenticated USING (true);
