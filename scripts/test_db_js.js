
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlamttcGt4bHhvbmJraGtkZHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzODE0MywiZXhwIjoyMDgxODE0MTQzfQ.-0Iff0Re2cMmiOpAic9v0Z6uYkKl0yFDNAW8m2xYCLU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);

    try {
        const { data, error } = await supabase.from('produtos').select('*').limit(1);

        if (error) {
            console.error('Error fetching table "produtos":', error.message);
            if (error.message.includes('relation "produtos" does not exist')) {
                console.log('--- SUGGESTION ---');
                console.log('You need to create the "produtos" table. Run this SQL in your Supabase SQL Editor:');
                console.log(`
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ean TEXT UNIQUE NOT NULL,
    modelo_referencia TEXT NOT NULL,
    fabricante TEXT NOT NULL,
    nfs_data JSONB DEFAULT '[]',
    modelos_data JSONB DEFAULT '[]',
    embalagem JSONB DEFAULT '[]',
    acessorios JSONB DEFAULT '[]',
    estetica JSONB DEFAULT '[]',
    funcional JSONB DEFAULT '[]',
    funcionalidade JSONB DEFAULT '[]',
    fotos TEXT[] DEFAULT '{}',
    manual_url TEXT,
    estoque_atual INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
                `);
            }
        } else {
            console.log('Success! Connection established and "produtos" table exists.');
            if (data && data.length > 0) {
                console.log('Sample data found:', Object.keys(data[0]));
            } else {
                console.log('Table exists but is empty.');
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
