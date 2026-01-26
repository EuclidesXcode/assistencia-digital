
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are missing. Using hardcoded defaults for development.');
}

const finalUrl = supabaseUrl || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const finalKey = supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlamttcGt4bHhvbmJraGtkZHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzgxNDMsImV4cCI6MjA4MTgxNDE0M30.BxoKQvW7Io2gkTJ5oG12v8AC0vrwSZnGOJ2ud_Q8gb8';

export const supabase = createClient(finalUrl, finalKey);
