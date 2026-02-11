
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking columns in "produtos"...');

    // Fetch one row
    const { data, error } = await supabase.from('produtos').select('*').limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('Table seems empty, cannot determine columns easily without metadata query. Trying insert.');
        // Try inserting with 'fabricante'
        const { error: insErr } = await supabase.from('produtos').insert([{ ean: 'TEST_COL', fabricante: 'TEST' }]);
        if (insErr && insErr.message.includes("column \"fabricante\" of relation \"produtos\" does not exist")) {
            console.error('MISSING COLUMN: fabricante');
        } else {
            console.log('Column "fabricante" seems to exist (or insert failed for other reason).');
            await supabase.from('produtos').delete().eq('ean', 'TEST_COL');
        }
    } else {
        const columns = Object.keys(data[0]);
        console.log('Columns found:', columns);
        if (!columns.includes('fabricante')) console.error('MISSING COLUMN: fabricante');
        if (!columns.includes('manual_url')) console.error('MISSING COLUMN: manual_url');
        if (!columns.includes('fotos')) console.error('MISSING COLUMN: fotos');
    }
}

checkSchema();
