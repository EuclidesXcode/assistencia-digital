
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlamttcGt4bHhvbmJraGtkZHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzODE0MywiZXhwIjoyMDgxODE0MTQzfQ.-0Iff0Re2cMmiOpAic9v0Z6uYkKl0yFDNAW8m2xYCLU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);

    try {
        // Try to fetch columns of 'produtos'
        const { data, error } = await supabase.from('produtos').select('*').limit(1);

        if (error) {
            console.error('Error fetching table "produtos":', error.message);
            if (error.message.includes('relation "produtos" does not exist')) {
                console.log('Suggestion: You need to create the "produtos" table.');
            }
        } else {
            console.log('Success! Connection established and "produtos" table exists.');
            if (data && data.length > 0) {
                console.log('Sample data found:', Object.keys(data[0]));
            } else {
                console.log('Table exists but is empty.');
                // Attempt to see if we can get schema via RPC or just assume basic columns are needed
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
