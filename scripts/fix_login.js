
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const TARGET_EMAIL = 'euclideslione@gmail.com';
const TARGET_PASSWORD = 'Eucode@2013';
const TARGET_BRANCH = '0001';
const TARGET_NAME = 'Euclides Silva';

async function fixLogin() {
    console.log(`Attempting to fix user: ${TARGET_EMAIL}`);

    // Try to create the user first.
    console.log('Attempting to create user via RPC create_app_user...');
    const { data: createData, error: createError } = await supabase
        .rpc('create_app_user', {
            p_email: TARGET_EMAIL,
            p_password: TARGET_PASSWORD,
            p_matriz_filial: TARGET_BRANCH,
            p_full_name: TARGET_NAME,
            p_role: 'admin',
            p_permissions: ['admin']
        })
        .single();

    if (createError) {
        console.log('Creation result/status:', createError.message);

        // Attempting update anyway if creation failed
        console.log('User might exist or schema is missing. Attempting to update password via profiles check...');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', TARGET_EMAIL)
            .single();

        if (profileError || !profile) {
            console.log('Could not find user in profiles. This usually means the schema is not initialized or user really doesnt exist.');
        } else {
            console.log(`Found user ID ${profile.id} in profiles. Updating password...`);
            const { error: pwdError } = await supabase
                .rpc('update_app_user_password', {
                    p_user_id: profile.id,
                    p_password: TARGET_PASSWORD
                });

            if (pwdError) {
                console.error('Error updating password:', pwdError.message);
            } else {
                console.log('Password updated successfully.');
            }
        }
    } else {
        console.log('User created successfully:', createData);
    }

    // Final verification
    console.log('Verifying login with RPC login_user...');
    const { data: loginData, error: loginError } = await supabase
        .rpc('login_user', {
            p_email: TARGET_EMAIL,
            p_password: TARGET_PASSWORD
        })
        .single();

    if (loginError) {
        console.error('Login verification FAILED:', loginError.message);
    } else {
        console.log('Login verification SUCCESSFUL!', loginData);
    }
}

fixLogin();
