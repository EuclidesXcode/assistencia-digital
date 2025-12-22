
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Fallback credentials (same as connection test)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Teklw3P-UwS87s2LSjkl2g_ZZ-4up2B';

const supabase = createClient(supabaseUrl, supabaseKey);

describe.skip('Admin Login Verification', () => {

    // Credentials from V2__seed_admin.sql
    const email = 'euclideslione@gmail.com';
    const password = 'Eucode@2013';

    it('should successfully login as the seeded admin user', async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Login failed:', error.message);
        }

        expect(error).toBeNull();
        expect(data.session).toBeDefined();
        expect(data.user).toBeDefined();
        expect(data.user?.email).toBe(email);
    });

    it('should retrieve the admin profile with correct branch', async () => {
        await supabase.auth.signInWithPassword({ email, password });

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*, branches(branch_code, branch_name)')
            .eq('email', email)
            .single();

        expect(error).toBeNull();
        expect(profile).toBeDefined();
        expect(profile.role).toBe('admin');
        expect(profile.branches?.branch_code).toBe('0001');
    });
});
