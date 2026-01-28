-- Update Trigger to Handle Branch Assignment via app_users.matriz_filial
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

DROP TRIGGER IF EXISTS on_app_user_created ON public.app_users;
CREATE TRIGGER on_app_user_created
  AFTER INSERT ON public.app_users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_app_user();
