-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ADDRESSES
CREATE TABLE addresses (
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
CREATE TABLE owners (
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
CREATE TABLE companies (
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
CREATE TABLE company_owner_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL, -- Partner, Legal representative, etc
  ownership_percentage NUMERIC(5,2)
);

-- 5. PEOPLE (Associated with companies)
CREATE TABLE people (
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
CREATE TABLE clients (
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
CREATE TABLE branches (
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

CREATE TABLE branch_contacts (
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
CREATE TABLE entities (
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
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matriz_filial TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_matriz_filial ON app_users(matriz_filial);

-- 9. PROFILES
CREATE TABLE profiles (
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
CREATE TABLE audit_logs (
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

-- RLS POLICIES
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: Correct syntax for Policies on tables that don't exist yet would error, but tables are created above.
-- However, "ON text" in previous file was likely a typo or placeholder. Correcting below.

CREATE POLICY "Enable read access for authenticated users" ON addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON owners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON entities FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_all_app_users" ON app_users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_profiles" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- TRIGGERS
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

CREATE OR REPLACE FUNCTION public.handle_new_app_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, permissions, is_active)
  VALUES (new.id, NULL, new.email, 'user', '{}', new.ativo)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_app_user_created
  AFTER INSERT ON app_users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_app_user();

-- INDEXES
CREATE INDEX idx_profiles_branch ON profiles(branch_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_clients_cnpj ON clients(cnpj);
CREATE INDEX idx_entities_cnpj ON entities(cnpj);

-- STORAGE BUCKET SCRIPT (If desired to run physically, ensure 'storage' schema is available)
-- Note: Often Supabase manages this hiddenly, but we can try to insert if permitted.
-- DO $$
-- BEGIN
--     INSERT INTO storage.buckets (id, name, public) VALUES ('evidences', 'evidences', true)
--     ON CONFLICT (id) DO NOTHING;
-- END $$;

-- STORAGE POLICIES (Assuming bucket exists or is created above)
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'evidences' );
-- CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'evidences' AND auth.role() = 'authenticated' );
