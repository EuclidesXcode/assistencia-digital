
-- Habilitar RLS para garantir que as politicas funcionem (ou desabilitar se preferir acesso total sem policies)
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Remover politicas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public Access" ON public.produtos;
DROP POLICY IF EXISTS "Allow All" ON public.produtos;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.produtos;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.produtos;
DROP POLICY IF EXISTS "Enable update for all users" ON public.produtos;

-- Criar politicas permissivas para ANON (public) já que o Auth é customizado
CREATE POLICY "Allow All" ON public.produtos
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Garantir acesso a outras tabelas se necessario
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Read Users" ON public.app_users FOR SELECT TO public USING (true);
CREATE POLICY "Allow Public Insert Users" ON public.app_users FOR INSERT TO public WITH CHECK (true);
-- Update/Delete geralmente restrito, mas para login customizado o backend usa service_role.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All Profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
