
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUniqueConstraint() {
    console.log('Checking unique constraint on EAN...');

    // We already have at least one product with EAN 'TEST_UNIQUE' likely. Or create one.
    const ean = `TEST_UNIQUE_${Date.now()}`;

    // Try inserts using SERVICE_ROLE (bypassing RLS) just to test constraints
    const p1 = { ean, modelo_ref: 'Test 1', fabricante: 'Test' };
    const p2 = { ean, modelo_ref: 'Test 2', fabricante: 'Test' };

    const { error: e1 } = await supabase.from('produtos').insert([p1]);
    if (e1) { console.error('First insert failed:', e1); return; }

    const { error: e2 } = await supabase.from('produtos').insert([p2]);
    if (e2) {
        if (e2.code === '23505') { // unique_violation
            console.error('UNIQUE CONSTRAINT STILL ACTIVE! Second insert failed:', e2);
        } else {
            console.error('Second insert failed with other error:', e2);
        }
    } else {
        console.log('Unique constraint is NOT active. Duplicate EAN allowed.');
        // Cleanup
        await supabase.from('produtos').delete().eq('ean', ean);
    }
}

checkUniqueConstraint();
