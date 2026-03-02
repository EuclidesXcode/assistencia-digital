import { NextResponse } from 'next/server';
import type { AnaliseTecnicaRegistro, AnaliseTecnicaStatus } from '@/backend/models/AnaliseTecnica';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function mapAnaliseTecnicaRow(data: any): AnaliseTecnicaRegistro {
  return {
    id: String(data?.id || ''),
    produtoId: String(data?.produto_id || ''),
    preAnaliseId: String(data?.pre_analise_id || ''),
    dataEntrada: String(data?.data_entrada || data?.created_at || ''),
    origem: String(data?.origem || ''),
    codigoNF: String(data?.codigo_nf || ''),
    modeloRef: String(data?.modelo_ref || ''),
    ean: String(data?.ean || ''),
    recebidoPor: String(data?.recebido_por || ''),
    analisadoPor: String(data?.analisado_por || ''),
    status: (data?.status || 'aguardando') as AnaliseTecnicaStatus,
    laudoTecnico: String(data?.laudo_tecnico || ''),
    observacoes: String(data?.observacoes || ''),
    dadosPreAnalise:
      data?.pre_analise?.respostas && typeof data.pre_analise.respostas === 'object'
        ? data.pre_analise.respostas
        : data?.dados_pre_analise && typeof data.dados_pre_analise === 'object'
          ? data.dados_pre_analise
          : {},
    createdAt: String(data?.created_at || ''),
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
        .from('analise_tecnica')
        .select('*, pre_analise:pre_analise_id ( respostas )')
        .in('status', ['aguardando', 'em_analise'])
        .order('data_entrada', { ascending: true }),
      supabaseAdmin
        .from('analise_tecnica')
        .select('*, pre_analise:pre_analise_id ( respostas )')
        .eq('status', 'concluido')
        .order('updated_at', { ascending: false })
    ]);

    if (filaResult.error) {
      return jsonNoStore({ error: filaResult.error.message }, { status: 500 });
    }

    if (historicoResult.error) {
      return jsonNoStore({ error: historicoResult.error.message }, { status: 500 });
    }

    return jsonNoStore({
      fila: (filaResult.data || []).map(mapAnaliseTecnicaRow),
      historico: (historicoResult.data || []).map(mapAnaliseTecnicaRow)
    });
  } catch (error) {
    console.error('Analise tecnica GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar analise tecnica: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
