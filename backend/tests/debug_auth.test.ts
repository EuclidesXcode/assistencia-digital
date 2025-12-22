
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Teklw3P-UwS87s2LSjkl2g_ZZ-4up2B';

const supabase = createClient(supabaseUrl, supabaseKey);

describe.skip('Auth Debugging', () => {
    it('should be able to simple query (sanity check)', async () => {
        const { data, error } = await supabase.from('addresses').select('id').limit(1);
        if (error) console.error('Sanity check failed:', error);
        expect(error).toBeNull();
    });

    it('should sign up a NEW test user', async () => {
        const email = `test_debug_${Date.now()}@example.com`;
        const password = 'Password123!';

        console.log('Attempting verify signup with:', email);

        // 1. Sign Up
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: 'Debug User'
                }
            }
        });

        if (error) {
            console.error('Signup Error:', error);
        }
        expect(error).toBeNull();
        expect(data.user).toBeDefined();

        // 2. Sign In (If auto-confirm is on, this works. If not, it fails "Email not confirmed")
        // We just want to see if the "Database error querying schema" happens on creation.
    });
});
