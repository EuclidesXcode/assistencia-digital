-- Unified Database Initialization Script
-- combines V1, V3, V4, V5, V6

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ADDRESSES
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code VARCHAR(10),
  street TEXT,
  number VARCHAR(20),
  complement TEXT,
  district TEXT,
  city TEXT,
  state CHAR(2),
  main_email TEXT,
  main_mobile TEXT,
  main_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. OWNERS (Physical Persons owning companies)
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  rg VARCHAR(20),
  birth_date DATE,
  address_id UUID REFERENCES addresses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. COMPANIES (Legal Entities)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  state_registration TEXT,
  municipal_registration TEXT,
  business_activity TEXT,
  cnae TEXT,
  address_id UUID REFERENCES addresses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. COMPANY OWNER ROLES
CREATE TABLE IF NOT EXISTS company_owner_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL, -- Partner, Legal representative, etc
  ownership_percentage NUMERIC(5,2)
);

-- 5. PEOPLE (Associated with companies)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL, -- Partner, Responsible, etc
  full_name TEXT NOT NULL,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  ownership_percentage NUMERIC(5,2),
  address_id UUID REFERENCES addresses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CLIENTS (Customers)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL, -- INDIVIDUAL | COMPANY

  -- Individual
  full_name TEXT,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  birth_date DATE,

  -- Company
  legal_name TEXT,
  trade_name TEXT,
  cnpj VARCHAR(18),
  state_registration TEXT,
  municipal_registration TEXT,
  business_activity TEXT,
  cnae TEXT,

  address_id UUID REFERENCES addresses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. BRANCHES (Filiais)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  branch_code TEXT, 
  cnpj VARCHAR(18),
  state_registration TEXT,
  municipal_registration TEXT,
  address_id UUID REFERENCES addresses(id),
  is_headquarters BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS branch_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  full_name TEXT,
  job_title TEXT,
  email TEXT,
  mobile TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ENTITIES (Manufacturers / Suppliers)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE, 
  entity_type TEXT NOT NULL, 
  name TEXT NOT NULL,
  legal_name TEXT,
  cnpj VARCHAR(18),
  website TEXT,
  notes TEXT,
  address_id UUID REFERENCES addresses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8.5 APP_USERS (Custom Auth)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matriz_filial TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_matriz_filial ON app_users(matriz_filial);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 9. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  branch_id UUID REFERENCES branches(id),
  role TEXT DEFAULT 'user',
  permissions TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. PRODUCTS (from V4)
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

-- 12. ORCAMENTOS (from V5)
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

-- 13. PRE_ANALISE (from V5)
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

-- 14. NFE_XMLS (from V5)
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

-- 15. NOTIFICATIONS (from V5)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  global BOOLEAN DEFAULT FALSE,
  type TEXT CHECK (type IN ('orcamento', 'recebimento', 'pre-analise', 'nfe', 'alerta', 'sucesso', 'cadastro')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  permission TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. RECEBIMENTOS (from V5)
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

-- RLS POLICIES (Consolidated and Safe)
DO $$ BEGIN
    -- Enable RLS on all tables
    ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
    ALTER TABLE people ENABLE ROW LEVEL SECURITY;
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
    ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pre_analise ENABLE ROW LEVEL SECURITY;
    ALTER TABLE nfe_xmls ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore if already enabled
END $$;

-- Drop existing policies to recreate them safely
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "' || r.tablename || '";';
    END LOOP;
END $$;

-- Create Policies
CREATE POLICY "Enable read access for authenticated users" ON addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON owners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON entities FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_all_app_users" ON app_users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_profiles" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Product Policies
CREATE POLICY "Enable read access for authenticated users" ON produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON produtos FOR UPDATE TO authenticated USING (true);

-- New Tables Policies
CREATE POLICY "Enable all access for authenticated users" ON orcamentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON pre_analise FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON nfe_xmls FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON recebimentos FOR ALL TO authenticated USING (true);
CREATE POLICY "service_role_all_notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);


-- TRIGGERS (from V6 and V1)
CREATE OR REPLACE FUNCTION public.handle_new_app_user() 
RETURNS trigger AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  IF new.matriz_filial IS NOT NULL THEN
    SELECT id INTO v_branch_id
    FROM public.branches
    WHERE branch_code = new.matriz_filial OR branch_name = new.matriz_filial
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, permissions, branch_id, is_active)
  VALUES (
    new.id,
    NULL,
    new.email,
    'user',
    '{}'::text[],
    v_branch_id,
    new.ativo
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        branch_id = EXCLUDED.branch_id,
        is_active = EXCLUDED.is_active;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to ensure clean recreation
DROP TRIGGER IF EXISTS on_app_user_created ON app_users;
CREATE TRIGGER on_app_user_created
  AFTER INSERT ON app_users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_app_user();


-- INDEXES (Safe creation)
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_entities_cnpj ON entities(cnpj);

-- Repair Script (from V3) - Upsert Admin
DO $$
DECLARE
    v_user_id UUID;
    v_branch_id UUID;
BEGIN
    -- 1. Get User ID (replace with actual logic or keep safe)
    SELECT id INTO v_user_id FROM app_users WHERE email = 'euclideslione@gmail.com';
    
    -- 2. Get Branch ID if exists, create dummy if not? 
    -- Assuming branch '0001' might not exist yet if fresh DB. 
    -- For now, we just skip if not found, or user must populate branches first.
    SELECT id INTO v_branch_id FROM public.branches WHERE branch_code = '0001' LIMIT 1;

    IF v_user_id IS NOT NULL AND v_branch_id IS NOT NULL THEN
         INSERT INTO public.profiles (id, full_name, email, role, branch_id, permissions, is_active)
         VALUES (
            v_user_id, 
            'Euclides Silva', 
            'euclideslione@gmail.com', 
            'admin', 
            v_branch_id, 
            '{}', 
            true
         )
         ON CONFLICT (id) DO UPDATE
         SET 
            role = 'admin',
            branch_id = v_branch_id,
            full_name = 'Euclides Silva',
            is_active = true;
    END IF;
END $$;


-- Custom Auth Functions
CREATE OR REPLACE FUNCTION public.login_user(p_email TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  matriz_filial TEXT,
  email TEXT,
  full_name TEXT,
  role TEXT,
  permissions TEXT[],
  branch_id UUID,
  branch_name TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.app_users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM public.app_users
  WHERE email = p_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_user.password_hash IS NULL OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RETURN;
  END IF;

  UPDATE public.profiles
    SET last_login = now()
  WHERE id = v_user.id;

  RETURN QUERY
  SELECT
    u.id,
    u.matriz_filial,
    u.email,
    p.full_name,
    p.role,
    p.permissions,
    p.branch_id,
    b.branch_name,
    u.ativo,
    u.created_at,
    u.updated_at,
    p.last_login
  FROM public.app_users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.branches b ON b.id = p.branch_id
  WHERE u.id = v_user.id
    AND u.ativo = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email TEXT,
  p_password TEXT,
  p_matriz_filial TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'user',
  p_permissions TEXT[] DEFAULT '{}'::text[],
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  matriz_filial TEXT,
  email TEXT,
  full_name TEXT,
  role TEXT,
  permissions TEXT[],
  branch_id UUID,
  branch_name TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_email IS NULL OR p_password IS NULL OR p_matriz_filial IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  IF EXISTS (SELECT 1 FROM public.app_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;

  INSERT INTO public.app_users (email, password_hash, matriz_filial)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), p_matriz_filial)
  RETURNING id INTO v_user_id;

  INSERT INTO public.profiles (id, full_name, email, role, permissions, branch_id, is_active)
  VALUES (v_user_id, p_full_name, p_email, COALESCE(p_role, 'user'), COALESCE(p_permissions, '{}'::text[]), p_branch_id, true)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        branch_id = EXCLUDED.branch_id,
        is_active = EXCLUDED.is_active;

  RETURN QUERY
  SELECT
    u.id,
    u.matriz_filial,
    u.email,
    p.full_name,
    p.role,
    p.permissions,
    p.branch_id,
    b.branch_name,
    u.ativo,
    u.created_at,
    u.updated_at
  FROM public.app_users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.branches b ON b.id = p.branch_id
  WHERE u.id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_app_user_password(
  p_user_id UUID,
  p_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_password IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  UPDATE public.app_users
    SET password_hash = crypt(p_password, gen_salt('bf')),
        updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

REVOKE ALL ON public.app_users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO service_role;

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

REVOKE ALL ON FUNCTION public.login_user(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_user(TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID) TO service_role;

REVOKE ALL ON FUNCTION public.update_app_user_password(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_app_user_password(UUID, TEXT) TO service_role;
