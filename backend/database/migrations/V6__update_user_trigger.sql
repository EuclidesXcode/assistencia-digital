-- Update Trigger to Handle Branch Assignment via Code
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_branch_id UUID;
  v_branch_code TEXT;
BEGIN
  -- Get branch code from metadata
  v_branch_code := new.raw_user_meta_data->>'branch_code';

  -- Try to find branch
  IF v_branch_code IS NOT NULL THEN
    SELECT id INTO v_branch_id FROM public.branches WHERE branch_code = v_branch_code LIMIT 1;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email, role, permissions, branch_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    'user', 
    '{}',
    v_branch_id
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
