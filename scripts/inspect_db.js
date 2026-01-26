
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting "produtos" table schema...');

    try {
        const { data, error } = await supabase.rpc('inspect_table', { table_name: 'produtos' });

        if (error) {
            console.error('RPC inspect_table failed, using fallback query.');
            // Fallback: try to select one row and check keys
            const { data: sample, error: selError } = await supabase.from('produtos').select('*').limit(1);
            if (selError) throw selError;

            if (sample && sample.length > 0) {
                console.log('Columns found in sample row:', Object.keys(sample[0]));
            } else {
                console.log('Table is empty, cannot inspect via selection.');
            }
        } else {
            console.log('Schema:', data);
        }
    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectSchema();
