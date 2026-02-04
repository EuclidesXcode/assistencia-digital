require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function grantAdmin(email) {
    console.log(`Granting admin privilegies to ${email}...`);

    // 1. Get User ID
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (userError || !user) {
        console.error('User not found in "users" table:', userError);
        return;
    }

    console.log(`Found user ID: ${user.id}`);

    // 2. Update Profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            role: 'admin',
            permissions: ['admin', 'recebimento', 'cadastro', 'orcamentos', 'nfe', 'pre-analise']
        })
        .eq('id', user.id);

    if (updateError) {
        console.error('Error updating profile:', updateError);
    } else {
        console.log('Success! User updated to admin role.');
    }
}

grantAdmin('euclides.silva@accurate.com.br');
