
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Parse .env manually or fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Teklw3P-UwS87s2LSjkl2g_ZZ-4up2B';

const supabase = createClient(supabaseUrl, supabaseKey);

async function recreateAdmin() {
    console.log('Starting Admin Re-creation Script...');

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
        }
        process.exit(1);
    }

    console.log('Sign Up successful. ID:', signUpData.user?.id);

    // 2. Login to get session (needed for RLS policies if we are updating our own profile)
    console.log('Logging in to acquire session...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error('Login failed after signup:', loginError.message);
        process.exit(1);
    }

    console.log('Login successful.');

    // 3. Get Branch ID
    console.log('Fetching Branch 0001 ID...');
    const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id')
        .eq('branch_code', '0001')
        .single();

    if (branchError || !branchData) {
        console.error('Failed to find branch 0001:', branchError?.message);
        // Continue anyway? No, we need branch for admin.
        console.log('Proceeding without branch update (check if branch exists).');
    }

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

    if (updateError) {
        console.error('Failed to update profile:', updateError.message);
        process.exit(1);
    }

    console.log('SUCCESS: Admin user re-created and promoted to Admin.');
}

recreateAdmin();
