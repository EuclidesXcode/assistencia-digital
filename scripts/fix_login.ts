
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

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
    console.log(`Checking user: ${TARGET_EMAIL}`);

    // 1. Check if user exists in app_users
    const { data: users, error: findError } = await supabase
        .from('app_users')
        .select('id')
        .eq('email', TARGET_EMAIL);

    if (findError) {
        console.error('Error finding user:', findError);
        return;
    }

    const user = users?.[0];

    if (user) {
        console.log(`User found (ID: ${user.id}). Updating password and details...`);

        // Update password via RPC
        const { error: pwdError } = await supabase
            .rpc('update_app_user_password', {
                p_user_id: user.id,
                p_password: TARGET_PASSWORD
            });

        if (pwdError) {
            console.error('Error updating password via RPC:', pwdError);
        } else {
            console.log('Password updated successfully.');
        }

        // Update metadata directly
        const { error: updateError } = await supabase
            .from('app_users')
            .update({
                matriz_filial: TARGET_BRANCH,
                ativo: true
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error updating user metadata:', updateError);
        } else {
            console.log('User metadata updated (matriz_filial, ativo).');
        }

        // Verify login now
        console.log('Verifying login...');
        const { data: loginData, error: loginError } = await supabase
            .rpc('login_user', {
                p_email: TARGET_EMAIL,
                p_password: TARGET_PASSWORD
            })
            .single();

        if (loginError) {
            console.error('Login verification failed:', loginError);
        } else {
            console.log('Login verification SUCCESSFUL!', {
                id: (loginData as any)?.id,
                email: (loginData as any)?.email
            });
        }

    } else {
        console.log('User not found. Creating new user...');

        const { data: newUserChunk, error: createError } = await supabase
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
            console.error('Error creating user:', createError);
        } else {
            const newUser = newUserChunk as any;
            console.log('User created successfully:', {
                id: newUser?.id,
                email: newUser?.email
            });
        }
    }
}

fixLogin();
