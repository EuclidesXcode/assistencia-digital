
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

// Validate Key Format (Basic check to avoid DOMException on atob)
const isValidKey = (key: string) => {
    // JWTs usually have 3 parts separated by dots
    return key && key.split('.').length === 3;
};

if (!isValidKey(supabaseKey!)) {
    console.warn('WARNING: Supabase Key does not look like a valid JWT. This might cause "The string did not match the expected pattern" errors.');
}

export const supabase = createClient(supabaseUrl!, supabaseKey!);
