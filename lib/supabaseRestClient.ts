/**
 * Helpers for calling the Supabase REST API directly with service-role credentials.
 * Used by API routes that need to bypass RLS without the Supabase client SDK.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseRestConfig = Boolean(SUPABASE_URL && SERVICE_KEY);

/** Returns the base URL for the Supabase REST API, or throws if not configured. */
export function getSupabaseRestUrl(): string {
    if (!SUPABASE_URL || !SERVICE_KEY) {
        throw new Error(
            'Configuração do servidor incompleta. Defina SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.'
        );
    }
    return SUPABASE_URL;
}

/** Standard headers required for authenticated Supabase REST API calls. */
export function supabaseServiceHeaders(): HeadersInit {
    if (!SERVICE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
    }
    return {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
    };
}
