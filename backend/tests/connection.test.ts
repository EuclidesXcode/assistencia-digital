
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars explicitly since we are outside Next.js context
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Fallback if .env.local isn't found or vars are missing (for CI/Generic test)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Teklw3P-UwS87s2LSjkl2g_ZZ-4up2B';

describe('Supabase Connection Test', () => {
    let supabase: ReturnType<typeof createClient>;

    beforeAll(() => {
        if (supabaseUrl === 'MISSING_URL') {
            console.warn('Supabase URL missing. Test might fail if not mocked.');
        }
        supabase = createClient(supabaseUrl, supabaseKey);
    });

    it('should connect and query the addresses table (even if empty)', async () => {
        // We try to select 1 record. Even if empty, it should return 200 OK and data as [].
        // If connection fails, it throws or returns error.
        const { data, error, status } = await supabase
            .from('addresses')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Supabase connection error:', error);
        }

        expect(error).toBeNull();
        expect(status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });
});
