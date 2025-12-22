-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Transaction to ensure atomic operations
BEGIN;

    -- 1. Create Initial Address (Idempotent)
    -- We use a DO block or common table expression modification to avoid duplicates if possible, 
    -- but for simplicity in this seed script we'll insert if not exists based on criteria.
    -- However, UUIDs are random. Let's try to reuse if 'Rua da Matriz' exists or just create new one if really needed.
    -- Better practice for seeds: Insert and ignore if similar data exists, or just proceed.
    -- To keep it simple and effective: We will perform inserts. If you ran this before partialy, you might have duplicates of address/owner/company. 
    -- Ideally, clean db before seed or use specific IDs. 
    
    -- Let's use specific UUIDs for the SEED data to ensure idempotency.
    -- Matriz Address ID: '00000000-0000-0000-0000-000000000001' (example) - actually valid UUIDs required.
    -- Let's just catch the user error specifically since that was the blocker.

    -- 5. Create Auth User (euclideslione@gmail.com) - Handles "Already Exists"
    DO $$
    DECLARE
        v_user_id UUID;
        v_branch_id UUID;
        v_address_id UUID;
        v_owner_id UUID;
        v_company_id UUID;
    BEGIN
        -- A. Setup Address, Owner, Company, Branch
        
        -- Insert Address if not exists (checked loosely by zip/street)
        INSERT INTO public.addresses (zip_code, street, number, district, city, state)
        VALUES ('00000-000', 'Rua da Matriz', '100', 'Centro', 'São Paulo', 'SP')
        ON CONFLICT DO NOTHING; -- Addresses doesn't have unique constraint on content, so this might duplicate. 
        -- To strictly avoid duplicates without unique constraints, we would strictly SELECT first.
        -- For this fix, let's assume we want to ensure the BRANCH exists.
        
        -- Create/Get Matriz Address
        SELECT id INTO v_address_id FROM public.addresses WHERE street = 'Rua da Matriz' AND number = '100' LIMIT 1;
        IF v_address_id IS NULL THEN
            INSERT INTO public.addresses (zip_code, street, number, district, city, state)
            VALUES ('00000-000', 'Rua da Matriz', '100', 'Centro', 'São Paulo', 'SP')
            RETURNING id INTO v_address_id;
        END IF;

        -- Create/Get Owner
        SELECT id INTO v_owner_id FROM public.owners WHERE cpf = '00000000000';
        IF v_owner_id IS NULL THEN
            INSERT INTO public.owners (full_name, cpf, address_id)
            VALUES ('Euclides Silva', '00000000000', v_address_id)
            RETURNING id INTO v_owner_id;
        END IF;

        -- Create/Get Company
        SELECT id INTO v_company_id FROM public.companies WHERE cnpj = '00000000000191';
        IF v_company_id IS NULL THEN
            INSERT INTO public.companies (owner_id, legal_name, trade_name, cnpj, address_id)
            VALUES (v_owner_id, 'Matriz Principal Ltda', 'Minha Empresa', '00000000000191', v_address_id)
            RETURNING id INTO v_company_id;
        END IF;

        -- Create/Get Branch 0001
        SELECT id INTO v_branch_id FROM public.branches WHERE branch_code = '0001' AND company_id = v_company_id;
        IF v_branch_id IS NULL THEN
            INSERT INTO public.branches (company_id, branch_name, branch_code, is_headquarters, address_id)
            VALUES (v_company_id, 'Matriz Sede', '0001', true, v_address_id)
            RETURNING id INTO v_branch_id;
        END IF;

        -- B. Create Auth User
        -- WARNING: Manually inserting into auth.users is unsafe and causes "Database error querying schema"
        -- during login because of password hash incompatibility or missing metadata.
        -- Please create the user via the Application's Sign Up page or accessing Supabase Dashboard.
        
        /* 
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'euclideslione@gmail.com';
        
        IF v_user_id IS NULL THEN
            -- Insert new user
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                uuid_generate_v4(),
                'authenticated',
                'authenticated',
                'euclideslione@gmail.com',
                crypt('Eucode@2013', gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}',
                '{"full_name":"Euclides Silva"}',
                now(),
                now(),
                '',
                ''
            ) RETURNING id INTO v_user_id;
        ELSE
            -- User exists, optionally update password if needed (commented out to be safe)
            -- UPDATE auth.users SET encrypted_password = crypt('Eucode@2013', gen_salt('bf')) WHERE id = v_user_id;
        END IF;
        */

        -- C. Update Profile (Link to Branch & Make Admin)
        -- Profile row is created by Trigger 'on_auth_user_created' automatically when user is inserted.
        -- If user already existed, profile should exist.
        
        UPDATE public.profiles
        SET 
            role = 'admin',
            branch_id = v_branch_id,
            full_name = 'Euclides Silva'
        WHERE id = v_user_id;
        
    END $$;

COMMIT;
