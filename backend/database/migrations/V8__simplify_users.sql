-- Migration to simplify login and use a more standard table name
BEGIN;

-- 1. Extensions and Base Functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Rename the table
ALTER TABLE IF EXISTS public.app_users RENAME TO users;

-- 3. Add username column (nullable initially)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 4. Make matriz_filial optional
ALTER TABLE public.users ALTER COLUMN matriz_filial DROP NOT NULL;

-- 5. Update the username column for existing users (use email prefix)
UPDATE public.users SET username = split_part(email, '@', 1) WHERE username IS NULL;

-- 6. Update foreign keys
-- ...

-- 7. Update the login function to support username OR email
DROP FUNCTION IF EXISTS public.login_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.login_user(p_login TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  matriz_filial TEXT,
  email TEXT,
  username TEXT,
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
  v_user public.users%ROWTYPE;
BEGIN
  -- Search by email or username
  SELECT * INTO v_user
  FROM public.users u
  WHERE (u.email = p_login OR u.username = p_login)
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

-- 8. Update user creation function
DROP FUNCTION IF EXISTS public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID);
DROP FUNCTION IF EXISTS public.create_app_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, TEXT);
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email TEXT,
  p_password TEXT,
  p_matriz_filial TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'user',
  p_permissions TEXT[] DEFAULT '{}'::text[],
  p_branch_id UUID DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  matriz_filial TEXT,
  email TEXT,
  username TEXT,
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
  v_username TEXT;
BEGIN
  IF p_email IS NULL OR p_password IS NULL THEN
    RAISE EXCEPTION 'Email and password are required';
  END IF;

  v_username := COALESCE(p_username, split_part(p_email, '@', 1));

  IF EXISTS (SELECT 1 FROM public.users u WHERE u.email = p_email OR u.username = v_username) THEN
    RAISE EXCEPTION 'User already exists (email or username)';
  END IF;

  INSERT INTO public.users (email, username, password_hash, matriz_filial)
  VALUES (p_email, v_username, crypt(p_password, gen_salt('bf')), p_matriz_filial)
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

-- 9. Fix Trigger handle_new_app_user to use 'users'
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

DROP TRIGGER IF EXISTS on_app_user_created ON public.users;
CREATE TRIGGER on_app_user_created
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_app_user();

-- 10. Update existing objects to point to 'users' table
-- (RLS Policies)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_app_users" ON public.users;
CREATE POLICY "service_role_all_users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 11. Revoke/Grant on new table name
REVOKE ALL ON public.users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- Update set_updated_at trigger
DROP TRIGGER IF EXISTS set_app_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
