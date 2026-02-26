import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
