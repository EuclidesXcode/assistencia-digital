
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Teklw3P-UwS87s2LSjkl2g_ZZ-4up2B';

// Debug environment variables
console.log('Supabase Initialization:', {
    hasUrl: !!supabaseUrl,
    url: supabaseUrl,
    hasKey: !!supabaseKey,
    keyLength: supabaseKey?.length
});

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl!, supabaseKey!);
