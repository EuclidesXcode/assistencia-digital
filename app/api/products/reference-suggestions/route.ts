import { NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';
import {
  DEFAULT_PRODUCT_SUGGESTIONS,
  ProductSuggestionCategory,
  normalizeProductSuggestionCategory
} from '@/lib/productReferenceCatalog';

export const dynamic = 'force-dynamic';

type CreateSuggestionPayload = {
  category?: string;
  value?: string;
};

type UpdateSuggestionPayload = {
  id?: string;
  category?: string;
  value?: string;
};

function norm(value: unknown) {
  return String(value || '').trim();
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
}

function normalizeCompare(value: unknown) {
  return upper(norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
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

function isMissingSuggestionTableError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const detail = String(error?.detail || error?.details || '').toLowerCase();
  const source = `${message} ${detail}`;
  return error?.code === '42P01' || source.includes('product_reference_suggestions');
}

function mapSuggestionRow(row: any) {
  const category = normalizeProductSuggestionCategory(row?.category);
  const value = norm(row?.value);
  if (!category || !value) return null;

  return {
    id: norm(row?.id),
    category,
    value,
    createdAt: norm(row?.created_at),
    updatedAt: norm(row?.updated_at)
  };
}

function buildDefaultSeedRows() {
  const rows: Array<{ category: ProductSuggestionCategory; value: string }> = [];

  (Object.keys(DEFAULT_PRODUCT_SUGGESTIONS) as ProductSuggestionCategory[]).forEach((category) => {
    DEFAULT_PRODUCT_SUGGESTIONS[category].forEach((value) => {
      const cleaned = norm(value);
      if (!cleaned) return;
      const duplicate = rows.some(
        (item) =>
          item.category === category &&
          normalizeCompare(item.value) === normalizeCompare(cleaned)
      );
      if (duplicate) return;
      rows.push({ category, value: cleaned });
    });
  });

  return rows;
}

async function loadSuggestionRows() {
  const { data, error } = await supabaseAdmin
    .from('product_reference_suggestions')
    .select('id, category, value, created_at, updated_at')
    .order('category', { ascending: true })
    .order('value', { ascending: true });

  if (error) {
    if (isMissingSuggestionTableError(error)) {
      throw new Error(
        'Tabela public.product_reference_suggestions nao encontrada. Rode o SQL de criacao das sugestoes antes de cadastrar novas.'
      );
    }
    throw new Error(error.message);
  }

  let rows = Array.isArray(data) ? data : [];
  if (rows.length > 0) return rows;

  const seedRows = buildDefaultSeedRows();
  if (seedRows.length === 0) return rows;

  const { error: seedError } = await supabaseAdmin
    .from('product_reference_suggestions')
    .insert(seedRows);

  if (seedError && seedError.code !== '23505') {
    throw new Error(seedError.message);
  }

  const retry = await supabaseAdmin
    .from('product_reference_suggestions')
    .select('id, category, value, created_at, updated_at')
    .order('category', { ascending: true })
    .order('value', { ascending: true });

  if (retry.error) {
    throw new Error(retry.error.message);
  }

  rows = Array.isArray(retry.data) ? retry.data : [];
  return rows;
}

async function findCategoryDuplicate(
  category: ProductSuggestionCategory,
  value: string,
  ignoreId?: string
) {
  const { data, error } = await supabaseAdmin
    .from('product_reference_suggestions')
    .select('id, value')
    .eq('category', category);

  if (error) {
    if (isMissingSuggestionTableError(error)) {
      throw new Error(
        'Tabela public.product_reference_suggestions nao encontrada. Rode o SQL de criacao das sugestoes antes de cadastrar novas.'
      );
    }
    throw new Error(error.message);
  }

  return (data || []).find((item) => {
    const id = norm(item?.id);
    if (ignoreId && id === ignoreId) return false;
    return normalizeCompare(item?.value) === normalizeCompare(value);
  });
}

export async function GET(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const url = new URL(request.url);
    const categoryFilter = normalizeProductSuggestionCategory(url.searchParams.get('category'));
    const rows = await loadSuggestionRows();
    const mapped = rows
      .map((row) => mapSuggestionRow(row))
      .filter((row): row is NonNullable<ReturnType<typeof mapSuggestionRow>> => !!row);

    const filtered = categoryFilter
      ? mapped.filter((item) => item.category === categoryFilter)
      : mapped;

    return jsonNoStore({ data: filtered });
  } catch (error: any) {
    return jsonNoStore(
      { error: String(error?.message || 'Erro ao buscar sugestoes.') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const body = (await request.json()) as CreateSuggestionPayload;
    const category = normalizeProductSuggestionCategory(body?.category);
    const value = norm(body?.value);

    if (!category) {
      return jsonNoStore({ error: 'Categoria de sugestao invalida.' }, { status: 400 });
    }

    if (!value) {
      return jsonNoStore({ error: 'Informe o valor da sugestao.' }, { status: 400 });
    }

    await loadSuggestionRows();

    const duplicate = await findCategoryDuplicate(category, value);
    if (duplicate) {
      const { data: current, error: currentError } = await supabaseAdmin
        .from('product_reference_suggestions')
        .select('id, category, value, created_at, updated_at')
        .eq('id', norm(duplicate.id))
        .maybeSingle();

      if (currentError) {
        throw new Error(currentError.message);
      }

      const mappedCurrent = mapSuggestionRow(current);
      if (!mappedCurrent) {
        return jsonNoStore(
          { error: 'Falha ao validar sugestao existente.' },
          { status: 500 }
        );
      }

      return jsonNoStore({
        ok: true,
        category,
        value: mappedCurrent.value,
        id: mappedCurrent.id,
        alreadyExisted: true,
        suggestion: mappedCurrent
      });
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from('product_reference_suggestions')
      .insert([
        {
          category,
          value,
          updated_at: new Date().toISOString()
        }
      ])
      .select('id, category, value, created_at, updated_at')
      .single();

    if (insertError) {
      if (isMissingSuggestionTableError(insertError)) {
        return jsonNoStore(
          {
            error:
              'Tabela public.product_reference_suggestions nao encontrada. Rode o SQL de criacao das sugestoes antes de cadastrar novas.'
          },
          { status: 400 }
        );
      }

      return jsonNoStore({ error: insertError.message }, { status: 500 });
    }

    const mappedCreated = mapSuggestionRow(created);
    if (!mappedCreated) {
      return jsonNoStore({ error: 'Falha ao mapear sugestao cadastrada.' }, { status: 500 });
    }

    return jsonNoStore(
      {
        ok: true,
        category,
        value: mappedCreated.value,
        id: mappedCreated.id,
        alreadyExisted: false,
        suggestion: mappedCreated
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Product reference suggestions POST error:', error);
    return jsonNoStore(
      { error: `Erro ao cadastrar sugestao: ${error instanceof Error ? error.message : String(error || 'Erro desconhecido')}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const body = (await request.json()) as UpdateSuggestionPayload;
    const id = norm(body?.id);
    const category = normalizeProductSuggestionCategory(body?.category);
    const value = norm(body?.value);

    if (!id) {
      return jsonNoStore({ error: 'ID da sugestao obrigatorio.' }, { status: 400 });
    }

    if (!category) {
      return jsonNoStore({ error: 'Categoria de sugestao invalida.' }, { status: 400 });
    }

    if (!value) {
      return jsonNoStore({ error: 'Informe o valor da sugestao.' }, { status: 400 });
    }

    await loadSuggestionRows();

    const duplicate = await findCategoryDuplicate(category, value, id);
    if (duplicate) {
      return jsonNoStore({ error: 'Ja existe uma sugestao igual nesta categoria.' }, { status: 409 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('product_reference_suggestions')
      .update({
        category,
        value,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, category, value, created_at, updated_at')
      .maybeSingle();

    if (error) {
      if (isMissingSuggestionTableError(error)) {
        return jsonNoStore(
          {
            error:
              'Tabela public.product_reference_suggestions nao encontrada. Rode o SQL de criacao das sugestoes antes de cadastrar novas.'
          },
          { status: 400 }
        );
      }

      return jsonNoStore({ error: error.message }, { status: 500 });
    }

    const mappedUpdated = mapSuggestionRow(updated);
    if (!mappedUpdated?.id) {
      return jsonNoStore({ error: 'Sugestao nao encontrada para atualizacao.' }, { status: 404 });
    }

    return jsonNoStore({ ok: true, suggestion: mappedUpdated });
  } catch (error) {
    console.error('Product reference suggestions PATCH error:', error);
    return jsonNoStore(
      { error: `Erro ao alterar sugestao: ${error instanceof Error ? error.message : String(error || 'Erro desconhecido')}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const url = new URL(request.url);
    const id = norm(url.searchParams.get('id'));

    if (!id) {
      return jsonNoStore({ error: 'ID da sugestao obrigatorio.' }, { status: 400 });
    }

    await loadSuggestionRows();

    const { data, error } = await supabaseAdmin
      .from('product_reference_suggestions')
      .delete()
      .eq('id', id)
      .select('id, category, value, created_at, updated_at')
      .maybeSingle();

    if (error) {
      if (isMissingSuggestionTableError(error)) {
        return jsonNoStore(
          {
            error:
              'Tabela public.product_reference_suggestions nao encontrada. Rode o SQL de criacao das sugestoes antes de cadastrar novas.'
          },
          { status: 400 }
        );
      }
      return jsonNoStore({ error: error.message }, { status: 500 });
    }

    const removed = mapSuggestionRow(data);
    if (!removed?.id) {
      return jsonNoStore({ error: 'Sugestao nao encontrada para exclusao.' }, { status: 404 });
    }

    return jsonNoStore({ ok: true, suggestion: removed });
  } catch (error) {
    console.error('Product reference suggestions DELETE error:', error);
    return jsonNoStore(
      { error: `Erro ao excluir sugestao: ${error instanceof Error ? error.message : String(error || 'Erro desconhecido')}` },
      { status: 500 }
    );
  }
}
