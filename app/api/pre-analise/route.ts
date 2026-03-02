import { NextResponse } from 'next/server';
import type { PreAnaliseProduto, PreAnaliseStatus } from '@/backend/models/PreAnalise';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function mapPreAnaliseRow(data: any): PreAnaliseProduto {
  return {
    id: String(data?.id || ''),
    produtoId: String(data?.produto_id || ''),
    data: String(data?.created_at || ''),
    recebidoPor: String(data?.recebido_por || ''),
    codigoNF: String(data?.codigo_nf || ''),
    modeloRef: String(data?.modelo_ref || ''),
    gtin: String(data?.gtin || data?.ean || ''),
    nfReceb: String(data?.nf_receb || ''),
    status: (data?.status || 'pendente') as PreAnaliseStatus,
    respostas: data?.respostas && typeof data.respostas === 'object' ? data.respostas : {},
    analisadoPor: String(data?.analisado_por || ''),
    dataAnalise: String(data?.data_analise || ''),
    updatedAt: String(data?.updated_at || '')
  };
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
    const [filaResult, historicoResult] = await Promise.all([
      supabaseAdmin
        .from('pre_analise')
        .select('*')
        .in('status', ['pendente', 'em_analise'])
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('pre_analise')
        .select('*')
        .in('status', ['aprovado', 'reprovado'])
        .order('updated_at', { ascending: false })
    ]);

    if (filaResult.error) {
      return jsonNoStore({ error: filaResult.error.message }, { status: 500 });
    }

    if (historicoResult.error) {
      return jsonNoStore({ error: historicoResult.error.message }, { status: 500 });
    }

    return jsonNoStore({
      fila: (filaResult.data || []).map(mapPreAnaliseRow),
      historico: (historicoResult.data || []).map(mapPreAnaliseRow)
    });
  } catch (error) {
    console.error('Pre-analise GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar pre-analise: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
