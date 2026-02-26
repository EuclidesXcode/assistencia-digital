<<<<<<< HEAD
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
=======
import { createClient, SupabaseClient } from '@supabase/supabase-js';
>>>>>>> 6a3c20c2c6b19913d556a0bc9422e4ed76ddcf06

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

<<<<<<< HEAD
const missingSupabaseConfigMessage =
  'Missing Supabase server configuration. Define SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.';

const supabaseAdminClient =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

if (!supabaseAdminClient) {
  console.warn(`[supabaseAdmin] ${missingSupabaseConfigMessage}`);
}

export const hasSupabaseAdminConfig = Boolean(supabaseUrl && serviceKey);
export const supabaseAdminConfigError = hasSupabaseAdminConfig
  ? null
  : missingSupabaseConfigMessage;

export const supabaseAdmin: SupabaseClient = supabaseAdminClient
  ? supabaseAdminClient
  : new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(missingSupabaseConfigMessage);
      }
    });
=======
export const hasSupabaseAdminConfig = Boolean(supabaseUrl && serviceKey);

export const supabaseAdminConfigError: string | null = hasSupabaseAdminConfig
  ? null
  : `Variáveis de ambiente ausentes: ${[
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null
  ]
    .filter(Boolean)
    .join(', ')}`;

export const supabaseAdmin: SupabaseClient = hasSupabaseAdminConfig
  ? createClient(supabaseUrl!, serviceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : (null as unknown as SupabaseClient);
>>>>>>> 6a3c20c2c6b19913d556a0bc9422e4ed76ddcf06
