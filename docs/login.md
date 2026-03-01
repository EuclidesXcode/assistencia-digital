# Login - Documentacao Tecnica

## Visao Geral
Esta fase conclui a migracao completa do login para autenticacao propria, sem Supabase Auth.
O banco passa a usar tabela customizada (app_users), funcoes SQL para login e rotas backend com service_role.
O Supabase Auth permanece no projeto, mas nao e mais utilizado pelo app.

## O que foi removido
- Chamadas a supabase.auth (signInWithPassword, signUp, admin.createUser).
- Dependencias de auth.users em FKs, triggers e policies.
- Policies com auth.uid() em profiles/notifications.

## O que foi criado
- Tabela public.app_users com hash de senha (bcrypt via pgcrypto).
- Funcoes SQL: login_user, create_app_user, update_app_user_password.
- Trigger de updated_at e trigger de criacao de profile via app_users.
- Rotas backend para login, cadastro, administracao de usuarios, auditoria e notificacoes.
- AuthService frontend consumindo APIs internas (sem supabase.auth).

## Estrutura do Banco
Tabela principal:
- public.app_users
  - id (UUID, PK)
  - matriz_filial (TEXT, NOT NULL)
  - email (TEXT, UNIQUE, NOT NULL)
  - password_hash (TEXT, NOT NULL)
  - ativo (BOOLEAN, default true)
  - created_at / updated_at

Atualizacoes de relacionamento:
- profiles.id -> app_users.id (FK)
- audit_logs.user_id -> app_users.id (FK)
- notifications.user_id -> app_users.id (FK)

Triggers:
- set_app_users_updated_at (BEFORE UPDATE)
- on_app_user_created -> handle_new_app_user (cria profile base)

Funcoes SQL:
- login_user(email, senha) valida crypt() e retorna dados seguros
- create_app_user(...) cria app_user + profile (sem expor password_hash)
- update_app_user_password(user_id, senha) atualiza hash

Script principal (migracao completa):
- backend/database/migrations/V7__custom_auth.sql

## Migracao de Dados
Migracao automatica incluida no script V7:
- Copia usuarios de auth.users para app_users.
- password_hash e gerado aleatoriamente (senha nao e migravel).
- Perfil e sincronizado (email/is_active).

Limitacoes:
- Senhas do Supabase Auth nao sao migraveis.
- E necessario fluxo de redefinicao de senha (envio de email ou reset manual).

## Seguranca
- RLS habilitado em app_users, profiles, audit_logs, notifications.
- Policies restritas a service_role (backend).
- password_hash nunca e retornado em consultas ou funcoes.
- Funcoes SQL usam SECURITY DEFINER e permissao apenas para service_role.

## Fluxo de Login
1. Usuario envia email/senha no frontend.
2. Frontend chama POST /api/auth/login.
3. Backend (service_role) executa RPC login_user.
4. login_user valida crypt() e retorna dados seguros.
5. Frontend salva usuario no localStorage.
6. Auditoria e registrada via POST /api/audit.

## Como validar o login
- Crie usuario via RPC (service_role):
  - SELECT * FROM public.create_app_user('email@dominio.com', 'Senha123', '0001', 'Nome');
- Realize login:
  - SELECT * FROM public.login_user('email@dominio.com', 'Senha123');
- Via API:
  - POST /api/auth/login { email, password }

## Observacoes importantes
- O Supabase Auth nao e mais utilizado pelo app.
- A migracao exige SUPABASE_SERVICE_ROLE_KEY configurado no backend.
- Acesso direto do cliente ao banco (anon) para perfis/notificacoes/auditoria foi descontinuado.
- Implementar fluxo de reset de senha e sessao/JWT proprio e o proximo passo recomendado.

Checklist de validacao:
- Verificar ausencia de supabase.auth no codigo (rg supabase.auth).
- Executar SELECT public.login_user(...) com usuario valido.
- Confirmar que password_hash nao aparece em nenhuma resposta.
- Validar acesso via APIs /api/auth/login e /api/admin/users.

---

SQL - Migracao completa (executar no Supabase SQL Editor)

```sql
-- Custom authentication migration (no Supabase Auth)
BEGIN;

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Custom users table
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matriz_filial TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_users_email_idx ON public.app_users (email);
CREATE INDEX IF NOT EXISTS app_users_matriz_filial_idx ON public.app_users (matriz_filial);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_app_users_updated_at ON public.app_users;
CREATE TRIGGER set_app_users_updated_at
BEFORE UPDATE ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Migrate existing users from auth.users (passwords cannot be migrated)
INSERT INTO public.app_users (id, matriz_filial, email, password_hash, ativo, created_at, updated_at)
SELECT
  au.id,
  COALESCE(b.branch_code, b.branch_name, 'MATRIZ'),
  au.email,
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  COALESCE(p.is_active, true),
  au.created_at,
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.branches b ON b.id = p.branch_id
WHERE au.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Sync profile email/status with app_users
UPDATE public.profiles p
SET email = u.email,
    is_active = u.ativo
FROM public.app_users u
WHERE p.id = u.id;

-- 5) Drop old auth.users trigger if present
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6) Ensure profiles reference app_users (not auth.users)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.app_users(id) ON DELETE CASCADE;

-- 7) Update audit_logs and notifications FKs
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

-- 8) Create profile on app_users insert (fallback if not using create_app_user)
CREATE OR REPLACE FUNCTION public.handle_new_app_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, permissions, branch_id, is_active)
  VALUES (NEW.id, NULL, NEW.email, 'user', '{}'::text[], NULL, NEW.ativo)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_app_user_created ON public.app_users;
CREATE TRIGGER on_app_user_created
AFTER INSERT ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_app_user();

-- 9) Functions for login and user creation
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

-- 10) RLS and policies
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read/update for own notifications" ON public.notifications;

DROP POLICY IF EXISTS "service_role_all_app_users" ON public.app_users;
CREATE POLICY "service_role_all_app_users"
  ON public.app_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_profiles" ON public.profiles;
CREATE POLICY "service_role_all_profiles"
  ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_audit_logs" ON public.audit_logs;
CREATE POLICY "service_role_all_audit_logs"
  ON public.audit_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_notifications" ON public.notifications;
CREATE POLICY "service_role_all_notifications"
  ON public.notifications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

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

COMMIT;
```

