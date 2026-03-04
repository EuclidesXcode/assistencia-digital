import { NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type CreateReferenciaPayload = {
  codigoNf?: string;
  modeloReferencia?: string;
  ean?: string;
  marca?: string;
  createdBy?: string;
};

function norm(value: unknown) {
  return String(value || '').trim();
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
}

function sanitizeCodigoNf(value: unknown) {
  return norm(value).replace(/\D/g, '');
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

function isMissingReferencesTableError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const detail = String(error?.detail || error?.details || '').toLowerCase();
  const source = `${message} ${detail}`;
  return error?.code === '42P01' || source.includes('recebimento_nf_referencias');
}

function mapReferencia(row: any) {
  return {
    id: norm(row?.id),
    codigoNf: sanitizeCodigoNf(row?.codigo_nf),
    modeloReferencia: norm(row?.modelo_referencia),
    ean: norm(row?.ean),
    marca: norm(row?.marca),
    createdBy: upper(row?.created_by),
    createdAt: norm(row?.created_at),
    updatedAt: norm(row?.updated_at)
  };
}

export async function GET(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const url = new URL(request.url);
    const codigoNf = sanitizeCodigoNf(url.searchParams.get('codigoNf'));

    let query = supabaseAdmin
      .from('recebimento_nf_referencias')
      .select('id, codigo_nf, modelo_referencia, ean, marca, created_by, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (codigoNf) {
      query = query.eq('codigo_nf', codigoNf);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingReferencesTableError(error)) {
        return jsonNoStore({
          data: [],
          warning:
            'Tabela public.recebimento_nf_referencias nao encontrada. Rode o SQL de criacao para habilitar cadastro de referencias.'
        });
      }
      return jsonNoStore({ error: error.message }, { status: 500 });
    }

    return jsonNoStore({ data: Array.isArray(data) ? data.map((item) => mapReferencia(item)) : [] });
  } catch (error) {
    console.error('Recebimento references GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar referencias do recebimento: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const body = (await request.json()) as CreateReferenciaPayload;
    const codigoNf = sanitizeCodigoNf(body?.codigoNf);
    const modeloReferencia = norm(body?.modeloReferencia);
    const ean = norm(body?.ean);
    const marca = norm(body?.marca);
    const createdBy = upper(body?.createdBy);

    if (!codigoNf || !/^\d{3,20}$/.test(codigoNf)) {
      return jsonNoStore({ error: 'Codigo NF invalido. Use entre 3 e 20 numeros.' }, { status: 400 });
    }

    if (!modeloReferencia) {
      return jsonNoStore({ error: 'Modelo referencia obrigatorio.' }, { status: 400 });
    }

    const payload = {
      codigo_nf: codigoNf,
      modelo_referencia: modeloReferencia,
      ean: ean || null,
      marca: marca || null,
      created_by: createdBy || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('recebimento_nf_referencias')
      .upsert([payload], { onConflict: 'codigo_nf' })
      .select('id, codigo_nf, modelo_referencia, ean, marca, created_by, created_at, updated_at')
      .single();

    if (error) {
      if (isMissingReferencesTableError(error)) {
        return jsonNoStore(
          {
            error:
              'Tabela public.recebimento_nf_referencias nao encontrada. Rode o SQL de criacao para habilitar cadastro de referencias.'
          },
          { status: 400 }
        );
      }

      return jsonNoStore({ error: error.message }, { status: 500 });
    }

    return jsonNoStore({ data: mapReferencia(data) }, { status: 201 });
  } catch (error) {
    console.error('Recebimento references POST error:', error);
    return jsonNoStore(
      { error: `Erro ao salvar referencia do recebimento: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

