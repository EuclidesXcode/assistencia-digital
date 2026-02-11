
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('Checking RLS policies for table: produtos');

    // We can't easily query policies via JS client directly without SQL.
    // So we will try to insert a product as an ANONYMOUS user (simulating the frontend).

    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const testProduct = {
        ean: `TEST_RLS_${Date.now()}`,
        modelo_ref: 'RLS_TEST',
        fabricante: 'TEST'
    };

    const { data, error } = await anonClient
        .from('produtos')
        .insert([testProduct])
        .select()
        .single();

    if (error) {
        console.error('Anonymous Insert Failed:', error);
        console.log('This confirms RLS is blocking anonymous inserts, or table is strictly secured.');
    } else {
        console.log('Anonymous Insert Success! ID:', data.id);
        console.log('RLS allows anonymous inserts.');
        // Cleanup
        await supabase.from('produtos').delete().eq('id', data.id);
    }
}

checkRLS();
