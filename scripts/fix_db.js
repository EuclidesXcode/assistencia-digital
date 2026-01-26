
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchema() {
    console.log('Fixing "produtos" table schema...');

    try {
        // We use query via PostgREST to metadata if possible, 
        // but since we can't run arbitrary SQL easily without RPC, 
        // let's try to insert a test record with the missing column and see if it fails.

        console.log('Attempting to add missing columns using RPC if available...');

        // Note: Supabase doesn't allow ALTER TABLE via standard API.
        // The user should run this in their SQL Editor.
        console.log('Please run the following SQL in your Supabase SQL Editor to ensure full compatibility:');
        console.log(`
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fabricante TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS manual_url TEXT;

-- Rename if they were named differently
-- ALTER TABLE produtos RENAME COLUMN modelo_referencia TO modelo_ref; 
-- ALTER TABLE produtos RENAME COLUMN modelos_data TO modelo_fabricante;
        `);

    } catch (err) {
        console.error('Fix failed:', err);
    }
}

fixSchema();
