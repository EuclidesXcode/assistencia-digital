import { NextResponse } from 'next/server';
import type {
  CreatePreAnaliseDTO,
  PreAnaliseProduto,
  PreAnaliseStatus
} from '@/backend/models/PreAnalise';
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

function sanitizeObject(value: Record<string, unknown> | undefined) {
  return value && typeof value === 'object' ? value : {};
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

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const body = (await request.json()) as Partial<CreatePreAnaliseDTO>;
    const produtoId = String(body?.produtoId || '').trim();

    if (!produtoId) {
      return jsonNoStore({ error: 'produto_id obrigatorio para criar Pre-Analise.' }, { status: 400 });
    }

    const payload = {
      produto_id: produtoId,
      codigo: String(body?.codigo || body?.codigoNF || '').trim(),
      modelo: String(body?.modelo || body?.modeloRef || '').trim(),
      ean: String(body?.ean || '').trim(),
      codigo_nf: String(body?.codigoNF || body?.codigo || '').trim() || null,
      modelo_ref: String(body?.modeloRef || body?.modelo || '').trim() || null,
      gtin: String(body?.gtin || body?.ean || '').trim() || null,
      nf_receb: String(body?.nfReceb || '').trim() || null,
      recebido_por: String(body?.recebidoPor || '').trim() || null,
      respostas: sanitizeObject(body?.respostas)
    };

    const { data: existing, error: findError } = await supabaseAdmin
      .from('pre_analise')
      .select('*')
      .eq('produto_id', produtoId)
      .limit(1)
      .maybeSingle();

    if (findError) {
      return jsonNoStore({ error: 'Erro ao verificar Pre-Analise existente.' }, { status: 500 });
    }

    if (existing?.id) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('pre_analise')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError) {
        return jsonNoStore({ error: 'Erro ao atualizar Pre-Analise do produto.' }, { status: 500 });
      }

      return jsonNoStore(mapPreAnaliseRow(updated));
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from('pre_analise')
      .insert([
        {
          ...payload,
          status: 'pendente'
        }
      ])
      .select('*')
      .single();

    if (insertError) {
      return jsonNoStore({ error: 'Erro ao criar Pre-Analise do produto.' }, { status: 500 });
    }

    return jsonNoStore(mapPreAnaliseRow(created));
  } catch (error) {
    console.error('Pre-analise POST error:', error);
    return jsonNoStore(
      { error: `Erro ao salvar pre-analise: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
