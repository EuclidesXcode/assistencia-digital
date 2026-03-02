import { NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type RevendaClienteOption = {
  id: string;
  nome: string;
  tipo: string;
  documento: string;
  origem: 'CLIENTE' | 'FILIAL';
};

function norm(value: unknown) {
  return String(value || '').trim();
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => norm(value)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return response;
}

function getMissingConfigResponse() {
  return jsonNoStore(
    {
      error:
        'Configuracao do servidor incompleta. Defina SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.',
      details: supabaseAdminConfigError
    },
    { status: 503 }
  );
}

function getSafeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || 'Erro desconhecido');
  const trimmed = raw.trim();
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}...` : trimmed;
}

export async function GET() {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const [clientsResult, branchesResult, fabricantesResult] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('id, person_type, trade_name, legal_name, full_name, cnpj, cpf'),
      supabaseAdmin
        .from('branches')
        .select('id, branch_name, cnpj, branch_code'),
      supabaseAdmin
        .from('entities')
        .select('id, name, legal_name')
        .eq('entity_type', 'MANUFACTURER')
    ]);

    if (clientsResult.error) {
      return jsonNoStore({ error: clientsResult.error.message }, { status: 500 });
    }

    if (branchesResult.error) {
      return jsonNoStore({ error: branchesResult.error.message }, { status: 500 });
    }

    if (fabricantesResult.error) {
      return jsonNoStore({ error: fabricantesResult.error.message }, { status: 500 });
    }

    const revendasClientes = uniqueSorted([
      ...(clientsResult.data || []).map((client) => {
        const nome = norm(client?.trade_name || client?.legal_name || client?.full_name);
        if (!nome) return null;

        return JSON.stringify({
          id: norm(client?.id) || `client:${nome}`,
          nome,
          tipo: upper(client?.person_type) === 'COMPANY' ? 'JURIDICA' : 'FISICA',
          documento: norm(client?.cnpj || client?.cpf),
          origem: 'CLIENTE'
        } satisfies RevendaClienteOption);
      }),
      ...(branchesResult.data || []).map((branch) => {
        const nome = norm(branch?.branch_name);
        if (!nome) return null;

        return JSON.stringify({
          id: norm(branch?.id) || `branch:${nome}`,
          nome,
          tipo: 'FILIAL',
          documento: norm(branch?.cnpj || branch?.branch_code),
          origem: 'FILIAL'
        } satisfies RevendaClienteOption);
      })
    ])
      .map((item) => {
        try {
          return JSON.parse(item) as RevendaClienteOption;
        } catch {
          return null;
        }
      })
      .filter((item): item is RevendaClienteOption => !!item);

    const fabricantes = uniqueSorted(
      (fabricantesResult.data || []).map((item) => norm(item?.name || item?.legal_name))
    );

    return jsonNoStore({
      revendasClientes,
      fabricantes
    });
  } catch (error) {
    console.error('Products references GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar referencias de produtos: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
