
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TARGET_EMAIL = 'euclideslione@gmail.com';
const TARGET_PASSWORD = 'Eucode@2013';

async function testSupabaseAuth() {
    console.log(`Testing standard Supabase Auth for: ${TARGET_EMAIL}`);
    const { data, error } = await supabase.auth.signInWithPassword({
        email: TARGET_EMAIL,
        password: TARGET_PASSWORD
    });

    if (error) {
        console.error('Supabase Auth error:', error.message);
    } else {
        console.log('Supabase Auth SUCCESS!', {
            user: data.user.id,
            email: data.user.email
        });
    }
}

testSupabaseAuth();
