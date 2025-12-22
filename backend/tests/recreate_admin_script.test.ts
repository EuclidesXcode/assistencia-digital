
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Parse .env manually or fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Teklw3P-UwS87s2LSjkl2g_ZZ-4up2B';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Admin User Re-creation Script', () => {
    // Increase timeout for network ops
    jest.setTimeout(30000);

    it('should re-create the admin user and promote to admin', async () => {
        console.log('Starting Admin Re-creation...');

        const email = 'euclideslione@gmail.com';
        const password = 'Eucode@2013';

        // 1. Sign Up
        console.log(`Attempting to Sign Up user: ${email}`);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: 'Euclides Silva'
                }
            }
        });

        if (signUpError) {
            console.error('Sign Up failed:', signUpError.message);
            if (signUpError.message.includes('already registered')) {
                console.error('ACTION REQUIRED: You must DELETE the user from the Supabase Dashboard first.');
                // Fail the test to alert me
                throw new Error('User already exists! Please delete it manually.');
            }
            throw signUpError;
        }

        console.log('Sign Up successful. ID:', signUpData.user?.id);

        // 2. Login to get session
        console.log('Logging in to acquire session...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (loginError) throw loginError;
        console.log('Login successful.');

        // 3. Get Branch ID
        console.log('Fetching Branch 0001 ID...');
        const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .select('id')
            .eq('branch_code', '0001')
            .single();

        const branchId = branchData?.id;

        // 4. Update Profile
        console.log('Updating Profile to Admin...');
        const updatePayload: any = {
            role: 'admin',
            full_name: 'Euclides Silva',
            is_active: true
        };
        if (branchId) updatePayload.branch_id = branchId;

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', loginData.user?.id);

        if (updateError) throw updateError;

        console.log('SUCCESS: Admin user re-created and promoted to Admin.');
    });
});
