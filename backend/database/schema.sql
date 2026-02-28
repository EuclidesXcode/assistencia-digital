-- =============================================================================
-- schema.sql — Estado completo do banco de dados
-- Gerado a partir de: V1, V4, V5, V6, V7, V8, V9, fix_schema_products, fix_rls
-- (V2 não existia; V3 era script de reparo pontual, não incluso aqui)
-- Para um banco limpo: execute este arquivo inteiro no Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ADDRESSES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code     VARCHAR(10),
  street       TEXT,
  number       VARCHAR(20),
  complement   TEXT,
  district     TEXT,
  city         TEXT,
  state        CHAR(2),
  main_email   TEXT,
  main_mobile  TEXT,
  main_phone   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. OWNERS (Pessoas físicas donas de empresas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owners (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name  TEXT NOT NULL,
  cpf        VARCHAR(14) NOT NULL UNIQUE,
  rg         VARCHAR(20),
  birth_date DATE,
  address_id UUID REFERENCES public.addresses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. COMPANIES (Pessoas jurídicas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  legal_name              TEXT NOT NULL,
  trade_name              TEXT,
  cnpj                    VARCHAR(18) NOT NULL UNIQUE,
  state_registration      TEXT,
  municipal_registration  TEXT,
  business_activity       TEXT,
  cnae                    TEXT,
  address_id              UUID REFERENCES public.addresses(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. COMPANY OWNER ROLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_owner_roles (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_type            TEXT NOT NULL,        -- Partner, Legal representative, etc.
  ownership_percentage NUMERIC(5,2)
);

-- ---------------------------------------------------------------------------
-- 5. PEOPLE (Associados a empresas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_type            TEXT NOT NULL,        -- Partner, Responsible, etc.
  full_name            TEXT NOT NULL,
  cpf                  VARCHAR(14),
  rg                   VARCHAR(20),
  ownership_percentage NUMERIC(5,2),
  address_id           UUID REFERENCES public.addresses(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. CLIENTS (Clientes — PF ou PJ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id               UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  person_type            TEXT NOT NULL,      -- INDIVIDUAL | COMPANY

  -- Pessoa Física
  full_name              TEXT,
  cpf                    VARCHAR(14),
  rg                     VARCHAR(20),
  birth_date             DATE,

  -- Pessoa Jurídica
  legal_name             TEXT,
  trade_name             TEXT,
  cnpj                   VARCHAR(18),
  state_registration     TEXT,
  municipal_registration TEXT,
  business_activity      TEXT,
  cnae                   TEXT,

  address_id             UUID REFERENCES public.addresses(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. BRANCHES (Filiais)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id             UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id              UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  branch_name            TEXT NOT NULL,
  branch_code            TEXT,
  cnpj                   VARCHAR(18),
  state_registration     TEXT,
  municipal_registration TEXT,
  address_id             UUID REFERENCES public.addresses(id),
  is_headquarters        BOOLEAN DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branch_contacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id  UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  full_name  TEXT,
  job_title  TEXT,
  email      TEXT,
  mobile     TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. ENTITIES (Fabricantes / Fornecedores)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  name        TEXT NOT NULL,
  legal_name  TEXT,
  cnpj        VARCHAR(18),
  website     TEXT,
  notes       TEXT,
  address_id  UUID REFERENCES public.addresses(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. USERS  (Autenticação customizada — era app_users, renomeada em V8)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  username      TEXT UNIQUE,                -- adicionado em V8
  password_hash TEXT NOT NULL,
  matriz_filial TEXT,                       -- era NOT NULL até V8 tornar opcional
  ativo         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx        ON public.users (email);
CREATE INDEX IF NOT EXISTS users_username_idx     ON public.users (username);
CREATE INDEX IF NOT EXISTS users_matriz_filial_idx ON public.users (matriz_filial);

-- ---------------------------------------------------------------------------
-- 10. PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  avatar_url  TEXT,
  branch_id   UUID REFERENCES public.branches(id),
  role        TEXT DEFAULT 'user',
  permissions TEXT[],
  is_active   BOOLEAN DEFAULT true,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 11. AUDIT LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id UUID,
  details     JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 12. PRODUTOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.produtos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ean             TEXT UNIQUE,              -- unique constraint de fix_schema_products
  modelo_ref      TEXT,
  marca           TEXT,                     -- Fabricante

  -- JSONB estruturado
  nfs_data        JSONB DEFAULT '[]'::jsonb,      -- [{ codigo, revenda }]
  modelos_data    JSONB DEFAULT '[]'::jsonb,      -- Array de modelos com sub-itens
  embalagem       JSONB DEFAULT '[]'::jsonb,
  acessorios      JSONB DEFAULT '[]'::jsonb,
  estetica        JSONB DEFAULT '[]'::jsonb,      -- adicionado em fix_schema_products
  funcional       JSONB DEFAULT '[]'::jsonb,      -- adicionado em fix_schema_products
  funcionalidade  JSONB DEFAULT '[]'::jsonb,      -- adicionado em V9

  -- Assets
  fotos           TEXT[] DEFAULT ARRAY[]::TEXT[], -- Fotos principais do produto (base64 data URLs)
  etiqueta_procel TEXT[] DEFAULT ARRAY[]::TEXT[], -- Etiquetas Procel (base64 data URLs)
  kit_acessorio   TEXT[] DEFAULT ARRAY[]::TEXT[], -- Fotos do kit de acessórios (base64 data URLs)
  manual_url      TEXT,

  -- Metadata
  estoque_atual   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.produtos IS 'Tabela de produtos';

-- ---------------------------------------------------------------------------
-- 13. ORCAMENTOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data               TIMESTAMPTZ NOT NULL DEFAULT now(),
  analisado_por      TEXT,
  codigo_nf          TEXT,
  modelo_fabricante  TEXT,
  ean                TEXT,
  nf                 TEXT,
  marca              TEXT,
  status             TEXT CHECK (status IN ('pendente', 'em_analise', 'concluido')) DEFAULT 'pendente',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 14. PRE_ANALISE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pre_analise (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo       TEXT,
  modelo       TEXT,
  ean          TEXT,
  status       TEXT CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'reprovado')) DEFAULT 'pendente',
  analisado_por TEXT,
  data_analise TIMESTAMPTZ,
  recebido_por TEXT,
  codigo_nf    TEXT,
  modelo_ref   TEXT,
  gtin         TEXT,
  nf_receb     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 15. NFE_XMLS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nfe_xmls (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave     TEXT UNIQUE NOT NULL,
  numero    TEXT,
  emissao   TIMESTAMPTZ,
  itens     INTEGER DEFAULT 0,
  status    TEXT CHECK (status IN ('PENDENTE', 'PARCIAL', 'DIVERGENTE', 'CONFERIDA', 'processada', 'erro')) DEFAULT 'PENDENTE',
  xml_data  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 16. NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  global     BOOLEAN DEFAULT false,
  type       TEXT CHECK (type IN ('orcamento', 'recebimento', 'pre-analise', 'nfe', 'alerta', 'sucesso', 'cadastro')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  permission TEXT,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 17. RECEBIMENTOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recebimentos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data              TIMESTAMPTZ NOT NULL DEFAULT now(),
  analisado_por     TEXT,
  codigo_nf         TEXT,
  modelo_fabricante TEXT,
  ean               TEXT,
  nf                TEXT,
  status            TEXT CHECK (status IN ('aguardando', 'em_processo', 'concluido', 'recebido')) DEFAULT 'aguardando',
  data_recebimento  TIMESTAMPTZ,

  -- Dados de recebimento físico
  lote_id           INTEGER,                          -- Número do lote de recebimento
  recebido_por      TEXT,                             -- Usuário que realizou o recebimento
  codigo_unico      TEXT,                             -- Código único do produto
  numero_serie      TEXT,                             -- Número de série
  com_nf            BOOLEAN DEFAULT true,             -- Se foi recebido com NF

  -- Fotos das etiquetas (base64 data URLs)
  -- Estrutura: { "CODIGO_UNICO": "data:image/jpeg;base64,...", "VISTORIA_REVENDA": "...", "SAT": "..." }
  fotos_etiquetas   JSONB DEFAULT '{}'::jsonb,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_branch    ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_user         ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource     ON public.audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj       ON public.clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_entities_cnpj      ON public.entities(cnpj);

-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES
-- ---------------------------------------------------------------------------

-- set_updated_at: atualiza coluna updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- TRIGGERS updated_at
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_users_updated_at      ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_addresses_updated_at  ON public.addresses;
CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_owners_updated_at     ON public.owners;
CREATE TRIGGER set_owners_updated_at
  BEFORE UPDATE ON public.owners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_companies_updated_at  ON public.companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_clients_updated_at    ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_branches_updated_at   ON public.branches;
CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_entities_updated_at   ON public.entities;
CREATE TRIGGER set_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at   ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_produtos_updated_at   ON public.produtos;
CREATE TRIGGER set_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: criar profile automaticamente ao inserir user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  -- Tenta resolver branch_id a partir de matriz_filial
  IF NEW.matriz_filial IS NOT NULL THEN
    SELECT id INTO v_branch_id
    FROM public.branches
    WHERE branch_code = NEW.matriz_filial
       OR branch_name = NEW.matriz_filial
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, permissions, branch_id, is_active)
  VALUES (NEW.id, NULL, NEW.email, 'user', '{}'::text[], v_branch_id, NEW.ativo)
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        branch_id = EXCLUDED.branch_id,
        is_active = EXCLUDED.is_active;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- FUNÇÃO: login_user (autenticação via email OU username)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.login_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.login_user(p_login TEXT, p_password TEXT)
RETURNS TABLE (
  id            UUID,
  matriz_filial TEXT,
  email         TEXT,
  username      TEXT,
  full_name     TEXT,
  role          TEXT,
  permissions   TEXT[],
  branch_id     UUID,
  branch_name   TEXT,
  ativo         BOOLEAN,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  last_login    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM public.users u
  WHERE u.email = p_login OR u.username = p_login
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_user.password_hash IS NULL
     OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RETURN;
  END IF;

  UPDATE public.profiles SET last_login = now() WHERE id = v_user.id;

  RETURN QUERY
  SELECT
    u.id,
    u.matriz_filial,
    u.email,
    u.username,
    p.full_name,
    p.role,
    p.permissions,
    p.branch_id,
    b.branch_name,
    u.ativo,
    u.created_at,
    u.updated_at,
    p.last_login
  FROM public.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.branches b ON b.id = p.branch_id
  WHERE u.id = v_user.id
    AND u.ativo = true;
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNÇÃO: create_app_user (criação de usuário com hash de senha)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID);
DROP FUNCTION IF EXISTS public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, TEXT);
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email         TEXT,
  p_password      TEXT,
  p_matriz_filial TEXT    DEFAULT NULL,
  p_full_name     TEXT    DEFAULT NULL,
  p_role          TEXT    DEFAULT 'user',
  p_permissions   TEXT[]  DEFAULT '{}'::text[],
  p_branch_id     UUID    DEFAULT NULL,
  p_username      TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  matriz_filial TEXT,
  email         TEXT,
  username      TEXT,
  full_name     TEXT,
  role          TEXT,
  permissions   TEXT[],
  branch_id     UUID,
  branch_name   TEXT,
  ativo         BOOLEAN,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_username TEXT;
BEGIN
  IF p_email IS NULL OR p_password IS NULL THEN
    RAISE EXCEPTION 'Email e senha são obrigatórios';
  END IF;

  v_username := COALESCE(p_username, split_part(p_email, '@', 1));

  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = p_email OR u.username = v_username
  ) THEN
    RAISE EXCEPTION 'Usuário já existe (email ou username)';
  END IF;

  INSERT INTO public.users (email, username, password_hash, matriz_filial)
  VALUES (p_email, v_username, crypt(p_password, gen_salt('bf')), p_matriz_filial)
  RETURNING id INTO v_user_id;

  INSERT INTO public.profiles (id, full_name, email, role, permissions, branch_id, is_active)
  VALUES (v_user_id, p_full_name, p_email,
          COALESCE(p_role, 'user'),
          COALESCE(p_permissions, '{}'::text[]),
          p_branch_id, true)
  ON CONFLICT (id) DO UPDATE
    SET full_name   = EXCLUDED.full_name,
        email       = EXCLUDED.email,
        role        = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        branch_id   = EXCLUDED.branch_id,
        is_active   = EXCLUDED.is_active;

  RETURN QUERY
  SELECT
    u.id,
    u.matriz_filial,
    u.email,
    u.username,
    p.full_name,
    p.role,
    p.permissions,
    p.branch_id,
    b.branch_name,
    u.ativo,
    u.created_at,
    u.updated_at
  FROM public.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.branches b ON b.id = p.branch_id
  WHERE u.id = v_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNÇÃO: update_app_user_password
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_app_user_password(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.update_app_user_password(p_user_id UUID, p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_password IS NULL THEN
    RAISE EXCEPTION 'Campos obrigatórios ausentes';
  END IF;

  UPDATE public.users
    SET password_hash = crypt(p_password, gen_salt('bf')),
        updated_at    = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- RLS habilitado em todas as tabelas.
-- Auth é 100% customizada (sem Supabase JWT), então:
--   • users, profiles, audit_logs, notifications → apenas service_role
--   • demais tabelas operacionais → acesso público (anon/authenticated)
--     pois o backend valida sessão antes de chamar a API.
-- ---------------------------------------------------------------------------

ALTER TABLE public.addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_owner_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_analise      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_xmls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos     ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (limpeza segura)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public."' || r.tablename || '";';
  END LOOP;
END $$;

-- Tabelas de autenticação e segurança: apenas service_role
CREATE POLICY "service_role_all_users"
  ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_profiles"
  ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_audit_logs"
  ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_notifications"
  ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tabelas operacionais: acesso público (backend usa service_role e valida sessão)
CREATE POLICY "Allow All" ON public.produtos           FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.addresses          FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.owners             FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.companies          FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.company_owner_roles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.people             FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.clients            FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.branches           FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.branch_contacts    FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.entities           FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.orcamentos         FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.pre_analise        FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.nfe_xmls           FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.recebimentos       FOR ALL TO public USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.users         FROM anon, authenticated;
REVOKE ALL ON public.profiles      FROM anon, authenticated;
REVOKE ALL ON public.audit_logs    FROM anon, authenticated;
REVOKE ALL ON public.notifications FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

REVOKE ALL ON FUNCTION public.login_user(TEXT, TEXT)                                          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_app_user_password(UUID, TEXT)                            FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.login_user(TEXT, TEXT)                                          TO service_role;
GRANT EXECUTE ON FUNCTION public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_app_user_password(UUID, TEXT)                            TO service_role;
