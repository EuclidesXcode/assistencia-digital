import { NextRequest, NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';
import { CreateProductDTO } from '@/backend/models/Product';
import { mapProduct } from '@/lib/productMapper';

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || '');
  const detail = String(error?.detail || error?.details || '');
  const source = `${message} ${detail}`;
  return (
    error?.code === '42703' ||
    /column .* does not exist/i.test(source) ||
    /could not find the '.*' column/i.test(source) ||
    /schema cache/i.test(source)
  );
}

function isDuplicateEanError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const detail = String(error?.detail || '').toLowerCase();
  return (
    error?.code === '23505' &&
    (message.includes('ean') ||
      message.includes('produtos_ean_key') ||
      detail.includes('ean') ||
      detail.includes('produtos_ean_key'))
  );
}

function isMalformedArrayLiteralError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const detail = String(error?.detail || error?.details || '').toLowerCase();
  const source = `${message} ${detail}`;
  return source.includes('malformed array literal');
}

function extractMalformedArrayLiteralValue(error: any): string | null {
  const message = String(error?.message || '');
  const detail = String(error?.detail || error?.details || '');
  const source = `${message} ${detail}`;
  const match = source.match(/malformed array literal:\s*"([^"]*)"/i);
  return match?.[1] ?? null;
}

function extractMissingColumnName(error: any): string | null {
  const message = String(error?.message || '');
  const detail = String(error?.detail || error?.details || '');
  const source = `${message} ${detail}`;

  const postgrestMatch = source.match(/could not find the '([^']+)' column/i);
  if (postgrestMatch?.[1]) return postgrestMatch[1];

  const postgresMatch = source.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i);
  if (postgresMatch?.[1]) return postgresMatch[1];

  return null;
}

const insertColumnAliases: Record<string, string[]> = {
  marca: ['fabricante'],
  fabricante: ['marca'],
  modelos_data: ['modelos'],
  nfs_data: ['nfs'],
  manual_url: ['manual'],
  estoque_atual: ['estoque']
};

function adaptPayloadForMissingColumn(payload: Record<string, unknown>, missingColumn: string) {
  if (!(missingColumn in payload)) {
    return false;
  }

  const aliasCandidates = insertColumnAliases[missingColumn] || [];

  // If any alias is already present in payload, we only need to remove the missing column.
  // This prevents writing the same value into an alternate alias with incompatible type
  // (e.g. string into array column such as modelo_fabricante in legacy schemas).
  const hasExistingAlias = aliasCandidates.some((candidate) => candidate in payload);
  if (hasExistingAlias) {
    delete payload[missingColumn];
    return true;
  }

  const replacement = aliasCandidates.find((candidate) => !(candidate in payload));
  if (replacement) {
    payload[replacement] = payload[missingColumn];
  }

  delete payload[missingColumn];
  return true;
}

function isLikelyArrayColumn(column: string) {
  return (
    column === 'marca' ||
    column === 'fabricante' ||
    column === 'codigo_nf' ||
    column === 'modelo_fabricante' ||
    column === 'fotos' ||
    column === 'embalagem' ||
    column === 'acessorios' ||
    column === 'estetica' ||
    column === 'funcional' ||
    column === 'funcionalidade' ||
    column.endsWith('_data')
  );
}

function adaptPayloadForArrayLiteral(payload: Record<string, unknown>, error: any) {
  const literal = extractMalformedArrayLiteralValue(error);
  if (literal != null) {
    for (const [key, value] of Object.entries(payload)) {
      if (!isLikelyArrayColumn(key) || Array.isArray(value)) continue;

      if (typeof value === 'string' && value.trim() === literal.trim()) {
        const trimmed = value.trim();
        payload[key] = trimmed ? [trimmed] : [];
        return true;
      }

      if (typeof value === 'number' && String(value) === literal.trim()) {
        payload[key] = [String(value)];
        return true;
      }
    }
  }

  const candidateKeys = [
    'marca',
    'fabricante',
    'codigo_nf',
    'modelo_fabricante',
    'nfs_data',
    'modelos_data',
    'embalagem',
    'acessorios',
    'estetica',
    'funcional',
    'funcionalidade',
    'fotos'
  ];

  for (const key of candidateKeys) {
    if (!(key in payload)) continue;

    const current = payload[key];
    if (Array.isArray(current)) continue;

    if (typeof current === 'string') {
      const trimmed = current.trim();
      payload[key] = trimmed ? [trimmed] : [];
      return true;
    }

    if (typeof current === 'number') {
      payload[key] = [String(current)];
      return true;
    }

    if (current == null) {
      payload[key] = [];
      return true;
    }
  }

  return false;
}

function buildPayloadSignature(payload: Record<string, unknown>) {
  const sortedPairs = Object.keys(payload)
    .sort()
    .map((key) => [key, payload[key]]);
  return JSON.stringify(sortedPairs);
}

async function findExistingProductByEan(ean: string): Promise<{ id: string } | null> {
  for (const key of ['ean', 'gtin']) {
    const { data, error } = await supabaseAdmin.from('produtos').select('id').eq(key, ean).limit(1);

    if (!error) {
      const row = Array.isArray(data) ? data[0] : null;
      if (row?.id) {
        return { id: String(row.id) };
      }
      return null;
    }

    if (!isMissingColumnError(error)) {
      throw error;
    }
  }

  return null;
}

function buildSearchFilters(q: string) {
  return [
    `ean.ilike.%${q}%,modelo_ref.ilike.%${q}%,marca.ilike.%${q}%,codigo_nf.ilike.%${q}%`,
    `ean.ilike.%${q}%,modelo_ref.ilike.%${q}%,fabricante.ilike.%${q}%,codigo_nf.ilike.%${q}%`,
    `ean.ilike.%${q}%,modelo_ref.ilike.%${q}%,modelo_fabricante.ilike.%${q}%,codigo_nf.ilike.%${q}%`,
    `ean.ilike.%${q}%,modelo_ref.ilike.%${q}%,codigo_nf.ilike.%${q}%`,
    `ean.ilike.%${q}%,modelo_ref.ilike.%${q}%`
  ];
}

function getMissingConfigResponse() {
  return NextResponse.json(
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

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get('q') || '').trim();
    const page = toPositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 20), 100);
    const latestLimit = Math.min(toPositiveInt(searchParams.get('limit'), 10), 100);

    if (q.length >= 3) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let queryData: any[] | null = null;
      let queryCount = 0;
      let queryError: any = null;

      for (const filter of buildSearchFilters(q)) {
        const { data, error, count } = await supabaseAdmin
          .from('produtos')
          .select('*', { count: 'exact' })
          .or(filter)
          .range(from, to)
          .order('created_at', { ascending: false });

        if (!error) {
          queryData = data || [];
          queryCount = count || 0;
          queryError = null;
          break;
        }

        queryError = error;
        if (!isMissingColumnError(error)) {
          break;
        }
      }

      if (queryError) {
        return NextResponse.json({ error: queryError.message }, { status: 500 });
      }

      const total = queryCount || 0;
      const totalPages = Math.ceil(total / pageSize);

      return NextResponse.json({
        data: (queryData || []).map((item: any) => mapProduct(item)),
        total,
        page,
        pageSize,
        totalPages
      });
    }

    const { data, error } = await supabaseAdmin
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(latestLimit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((item: any) => mapProduct(item));
    return NextResponse.json({
      data: mapped,
      total: mapped.length,
      page: 1,
      pageSize: latestLimit,
      totalPages: 1
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { error: `Erro ao buscar produtos: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const body = (await req.json()) as Partial<CreateProductDTO>;
    const ean = String(body?.ean || '').trim();
    const modeloRef = String(body?.modeloRef || '').trim();
    const marca = String(body?.marca || '').trim();
    const nfs = Array.isArray(body?.nfs) ? body.nfs : [];
    const modelos = Array.isArray(body?.modelos) ? body.modelos : [];

    const firstCodigoNf =
      nfs.length > 0 && typeof (nfs[0] as any)?.codigo === 'string'
        ? String((nfs[0] as any).codigo).trim() || null
        : null;

    const firstModeloFabricante =
      modelos.length > 0 && typeof (modelos[0] as any)?.nome === 'string'
        ? String((modelos[0] as any).nome).trim() || null
        : modeloRef || null;

    const esteticaRoot = Array.isArray(body?.estetica) ? body.estetica : [];
    const funcionalRoot = Array.isArray(body?.funcional) ? body.funcional : [];
    const esteticaFromModelos = modelos.flatMap((modelo: any) =>
      Array.isArray(modelo?.estetica) ? modelo.estetica : []
    );
    const funcionalFromModelos = modelos.flatMap((modelo: any) =>
      Array.isArray(modelo?.funcional) ? modelo.funcional : []
    );
    const esteticaPayload = esteticaRoot.length > 0 ? esteticaRoot : esteticaFromModelos;
    const funcionalPayload = funcionalRoot.length > 0 ? funcionalRoot : funcionalFromModelos;

    if (!ean || !modeloRef || !marca) {
      return NextResponse.json(
        { error: 'EAN, modelo de referencia e marca sao obrigatorios.' },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      ean,
      modelo_ref: modeloRef,
      marca,
      fabricante: marca,
      modelo_fabricante: firstModeloFabricante,
      codigo_nf: firstCodigoNf,
      manual_url: body?.manualUrl || null,
      fotos: Array.isArray(body?.fotos) ? body!.fotos : [],
      nfs_data: nfs,
      modelos_data: modelos,
      embalagem: Array.isArray(body?.embalagem) ? body!.embalagem : [],
      acessorios: Array.isArray(body?.acessorios) ? body!.acessorios : [],
      estetica: esteticaPayload,
      funcional: funcionalPayload,
      funcionalidade: Array.isArray(body?.funcionalidade) ? body!.funcionalidade : [],
      estoque_atual: 0
    };

    let insertedId: string | null = null;
    let lastError: any = null;
    const payloadSignatures = new Set<string>();

    for (let attempt = 0; attempt < 20; attempt++) {
      const { data, error } = await supabaseAdmin
        .from('produtos')
        .insert([payload])
        .select('id')
        .single();

      if (!error) {
        insertedId = data?.id ? String(data.id) : null;
        lastError = null;
        break;
      }

      lastError = error;
      if (isDuplicateEanError(error)) {
        break;
      }

      if (isMalformedArrayLiteralError(error)) {
        const adaptedArray = adaptPayloadForArrayLiteral(payload, error);
        if (adaptedArray) {
          const signature = buildPayloadSignature(payload);
          if (payloadSignatures.has(signature)) {
            break;
          }
          payloadSignatures.add(signature);
          continue;
        }
      }

      if (!isMissingColumnError(error)) {
        break;
      }

      const missingColumn = extractMissingColumnName(error);
      if (!missingColumn) {
        break;
      }

      const adapted = adaptPayloadForMissingColumn(payload, missingColumn);
      if (!adapted) {
        break;
      }

      const signature = buildPayloadSignature(payload);
      if (payloadSignatures.has(signature)) {
        break;
      }
      payloadSignatures.add(signature);
    }

    if (lastError) {
      if (isDuplicateEanError(lastError)) {
        return NextResponse.json(
          { error: 'O banco ainda exige EAN unico. Rode a migration que remove a constraint produtos_ean_key.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Erro ao salvar produto: ${String(lastError.message || lastError)}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, id: insertedId });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json(
      { error: `Erro interno ao cadastrar produto: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const body = (await req.json()) as (CreateProductDTO & {
      id?: string;
      originalEan?: string;
      ean?: string;
      modeloRef?: string;
      marca?: string;
    });

    const id = String(body?.id || '').trim();
    const originalEan = String(body?.originalEan || '').trim();
    const ean = String(body?.ean || '').trim();
    const modeloRef = String(body?.modeloRef || '').trim();
    const marca = String(body?.marca || '').trim();

    if (!id && !originalEan) {
      return NextResponse.json({ error: 'ID do produto obrigatorio para alteracao.' }, { status: 400 });
    }

    if (!ean || !modeloRef || !marca) {
      return NextResponse.json(
        { error: 'EAN, modelo de referencia e marca sao obrigatorios.' },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      ean,
      modelo_ref: modeloRef,
      fabricante: marca,
      updated_at: new Date().toISOString()
    };

    const hasFullProductPayload = [
      'nfs',
      'modelos',
      'embalagem',
      'acessorios',
      'estetica',
      'funcional',
      'funcionalidade',
      'fotos',
      'manualUrl'
    ].some((key) => Object.prototype.hasOwnProperty.call(body, key));

    if (hasFullProductPayload) {
      const nfs = Array.isArray(body?.nfs) ? body.nfs : [];
      const modelos = Array.isArray(body?.modelos) ? body.modelos : [];
      const firstCodigoNf =
        nfs.length > 0 && typeof (nfs[0] as any)?.codigo === 'string'
          ? String((nfs[0] as any).codigo).trim() || null
          : null;
      const firstModeloFabricante =
        modelos.length > 0 && typeof (modelos[0] as any)?.nome === 'string'
          ? String((modelos[0] as any).nome).trim() || null
          : modeloRef || null;

      const esteticaRoot = Array.isArray(body?.estetica) ? body.estetica : [];
      const funcionalRoot = Array.isArray(body?.funcional) ? body.funcional : [];
      const esteticaFromModelos = modelos.flatMap((modelo: any) =>
        Array.isArray(modelo?.estetica) ? modelo.estetica : []
      );
      const funcionalFromModelos = modelos.flatMap((modelo: any) =>
        Array.isArray(modelo?.funcional) ? modelo.funcional : []
      );
      const esteticaPayload = esteticaRoot.length > 0 ? esteticaRoot : esteticaFromModelos;
      const funcionalPayload = funcionalRoot.length > 0 ? funcionalRoot : funcionalFromModelos;

      payload.modelo_fabricante = firstModeloFabricante;
      payload.codigo_nf = firstCodigoNf;
      payload.manual_url = body?.manualUrl || null;
      payload.fotos = Array.isArray(body?.fotos) ? body.fotos : [];
      payload.nfs_data = nfs;
      payload.modelos_data = modelos;
      payload.embalagem = Array.isArray(body?.embalagem) ? body.embalagem : [];
      payload.acessorios = Array.isArray(body?.acessorios) ? body.acessorios : [];
      payload.estetica = esteticaPayload;
      payload.funcional = funcionalPayload;
      payload.funcionalidade = Array.isArray(body?.funcionalidade) ? body.funcionalidade : [];
    }

    let lastError: any = null;
    let updatedRows: Array<{ id?: string; ean?: string }> | null = null;
    const payloadSignatures = new Set<string>();
    const updateTargets: Array<{ key: string; value: string }> = id
      ? [{ key: 'id', value: id }]
      : [
          { key: 'ean', value: originalEan },
          { key: 'gtin', value: originalEan }
        ];

    for (let attempt = 0; attempt < 20; attempt++) {
      let shouldContinueBySchemaFallback = false;
      lastError = null;

      for (const target of updateTargets) {
        const { data, error } = await supabaseAdmin
          .from('produtos')
          .update(payload)
          .eq(target.key, target.value)
          .select('id, ean');

        if (!error) {
          updatedRows = (data || []) as Array<{ id?: string; ean?: string }>;
          lastError = null;
          shouldContinueBySchemaFallback = false;
          break;
        }

        lastError = error;
        if (isMissingColumnError(error) && updateTargets.length > 1) {
          shouldContinueBySchemaFallback = true;
          continue;
        }

        shouldContinueBySchemaFallback = false;
        break;
      }

      if (!lastError) {
        break;
      }

      if (shouldContinueBySchemaFallback) {
        continue;
      }

      if (isDuplicateEanError(lastError)) {
        break;
      }

      if (isMalformedArrayLiteralError(lastError)) {
        const adaptedArray = adaptPayloadForArrayLiteral(payload, lastError);
        if (adaptedArray) {
          const signature = buildPayloadSignature(payload);
          if (payloadSignatures.has(signature)) {
            break;
          }
          payloadSignatures.add(signature);
          continue;
        }
      }

      if (!isMissingColumnError(lastError)) {
        break;
      }

      const missingColumn = extractMissingColumnName(lastError);
      if (!missingColumn) {
        break;
      }

      const adapted = adaptPayloadForMissingColumn(payload, missingColumn);
      if (!adapted) {
        break;
      }

      const signature = buildPayloadSignature(payload);
      if (payloadSignatures.has(signature)) {
        break;
      }
      payloadSignatures.add(signature);
    }

    if (lastError) {
      if (isDuplicateEanError(lastError)) {
        return NextResponse.json(
          { error: 'O banco ainda exige EAN unico. Rode a migration que remove a constraint produtos_ean_key.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Erro ao alterar produto: ${String(lastError.message || lastError)}` },
        { status: 400 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'Produto nao encontrado para alteracao.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: updatedRows[0]?.id || id || null, ean: updatedRows[0]?.ean || ean });
  } catch (error) {
    console.error('Products PUT error:', error);
    return NextResponse.json(
      { error: `Erro interno ao alterar produto: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get('id') || '').trim();
    const ean = String(searchParams.get('ean') || '').trim();

    if (!id && !ean) {
      return NextResponse.json({ error: 'ID do produto obrigatorio para exclusao.' }, { status: 400 });
    }

    let deletedRows: Array<{ id?: string }> | null = null;
    let deleteError: any = null;

    if (id) {
      const { data, error } = await supabaseAdmin.from('produtos').delete().eq('id', id).select('id');
      deletedRows = (data || []) as Array<{ id?: string }>;
      deleteError = error;
    } else {
      for (const key of ['ean', 'gtin']) {
        const { data, error } = await supabaseAdmin
          .from('produtos')
          .delete()
          .eq(key, ean)
          .select('id');

        if (!error) {
          deletedRows = (data || []) as Array<{ id?: string }>;
          deleteError = null;
          break;
        }

        deleteError = error;
        if (!isMissingColumnError(error)) {
          break;
        }
      }
    }

    if (deleteError) {
      return NextResponse.json(
        { error: `Erro ao excluir produto: ${String(deleteError.message || deleteError)}` },
        { status: 400 }
      );
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Produto nao encontrado para exclusao.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: deletedRows[0]?.id || id || null });
  } catch (error) {
    console.error('Products DELETE error:', error);
    return NextResponse.json(
      { error: `Erro interno ao excluir produto: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
