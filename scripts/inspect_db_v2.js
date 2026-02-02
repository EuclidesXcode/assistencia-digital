
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectSchema() {
    console.log('Inspecting schema...');

    // Try to query information_schema or just check if app_users exists
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error querying profiles:', error.message);
    } else {
        console.log('Profiles sample:', data);
    }

    // Try to query app_users directly
    const { data: users, error: usersError } = await supabase
        .from('app_users')
        .select('*')
        .limit(5);

    if (usersError) {
        console.error('Error querying app_users:', usersError.message);
    } else {
        console.log('App Users sample:', users);
    }
}

inspectSchema();
