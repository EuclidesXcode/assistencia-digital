-- Repair Script: Ensure Admin Profile Exists
BEGIN;

    DO $$
    DECLARE
        v_user_id UUID;
        v_branch_id UUID;
    BEGIN
        -- 1. Get User ID
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'euclideslione@gmail.com';
        
        -- 2. Get Branch ID
        SELECT id INTO v_branch_id FROM public.branches WHERE branch_code = '0001' LIMIT 1;

        IF v_user_id IS NOT NULL THEN
            -- 3. Upsert Profile
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

COMMIT;
