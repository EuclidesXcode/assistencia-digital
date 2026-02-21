import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
