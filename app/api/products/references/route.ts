import { NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';
import {
  DEFAULT_PRODUCT_SUGGESTIONS,
  ProductReferenceSuggestionItem,
  ProductSuggestionCatalog,
  ProductSuggestionCategory,
  buildFallbackSuggestionItemsFromCatalog,
  buildProductSuggestionCatalogFromItems,
  createEmptyProductSuggestionCatalog,
  normalizeProductSuggestionCategory
} from '@/lib/productReferenceCatalog';

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

function normalizeCompare(value: unknown) {
  return upper(norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return response;
}

function toBranchOption(branch: any): RevendaClienteOption | null {
  const nome = norm(branch?.branch_name);
  if (!nome) return null;

  return {
    id: norm(branch?.id) || `branch:${nome}`,
    nome,
    tipo: 'FILIAL',
    documento: norm(branch?.cnpj || branch?.branch_code),
    origem: 'FILIAL'
  };
}

function toClientOption(client: any): RevendaClienteOption | null {
  const nome = norm(client?.trade_name || client?.legal_name || client?.full_name);
  if (!nome) return null;

  return {
    id: norm(client?.id) || `client:${nome}`,
    nome,
    tipo: upper(client?.person_type) === 'COMPANY' ? 'JURIDICA' : 'FISICA',
    documento: norm(client?.cnpj || client?.cpf),
    origem: 'CLIENTE'
  };
}

function isRealBranch(branch: any) {
  return Boolean(branch?.is_headquarters || branch?.company_id || branch?.client_id);
}

function dedupeRevendasClientes(options: RevendaClienteOption[]) {
  const map = new Map<string, RevendaClienteOption>();

  options.forEach((option) => {
    const key = upper(option?.nome);
    if (!key) return;

    const current = map.get(key);
    if (!current) {
      map.set(key, option);
      return;
    }

    if (current.origem !== 'CLIENTE' && option.origem === 'CLIENTE') {
      map.set(key, option);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
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

function isMissingSuggestionTableError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const detail = String(error?.detail || error?.details || '').toLowerCase();
  const source = `${message} ${detail}`;
  return error?.code === '42P01' || source.includes('product_reference_suggestions');
}

function mapSuggestionRow(row: any): ProductReferenceSuggestionItem | null {
  const id = norm(row?.id);
  const category = normalizeProductSuggestionCategory(row?.category);
  const value = norm(row?.value);

  if (!id || !category || !value) return null;
  return {
    id,
    category,
    value
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

type LoadedSuggestionData = {
  catalog: ProductSuggestionCatalog;
  items: ProductReferenceSuggestionItem[];
};

async function loadSuggestionCatalog() {
  const { data, error } = await supabaseAdmin
    .from('product_reference_suggestions')
    .select('id, category, value')
    .order('category', { ascending: true })
    .order('value', { ascending: true });

  if (error) {
    if (isMissingSuggestionTableError(error)) {
      return {
        catalog: buildProductSuggestionCatalogFromItems(
          buildFallbackSuggestionItemsFromCatalog(DEFAULT_PRODUCT_SUGGESTIONS)
        ),
        items: buildFallbackSuggestionItemsFromCatalog(DEFAULT_PRODUCT_SUGGESTIONS)
      } as LoadedSuggestionData;
    }

    throw new Error(error.message);
  }

  let rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    const seedRows = buildDefaultSeedRows();
    if (seedRows.length > 0) {
      const { error: seedError } = await supabaseAdmin
        .from('product_reference_suggestions')
        .insert(seedRows);

      if (seedError && seedError.code !== '23505') {
        throw new Error(seedError.message);
      }

      const retry = await supabaseAdmin
        .from('product_reference_suggestions')
        .select('id, category, value')
        .order('category', { ascending: true })
        .order('value', { ascending: true });

      if (retry.error) {
        throw new Error(retry.error.message);
      }

      rows = Array.isArray(retry.data) ? retry.data : [];
    }
  }

  const items = rows
    .map((row) => mapSuggestionRow(row))
    .filter((item): item is ProductReferenceSuggestionItem => !!item);

  if (items.length === 0) {
    return {
      catalog: createEmptyProductSuggestionCatalog(),
      items: []
    } as LoadedSuggestionData;
  }

  return {
    catalog: buildProductSuggestionCatalogFromItems(items),
    items
  } as LoadedSuggestionData;
}

export async function GET() {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const [clientsResult, branchesResult, fabricantesResult, suggestionData] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('id, person_type, trade_name, legal_name, full_name, cnpj, cpf'),
      supabaseAdmin
        .from('branches')
        .select('id, branch_name, cnpj, branch_code, company_id, client_id, is_headquarters'),
      supabaseAdmin
        .from('entities')
        .select('id, name, legal_name')
        .eq('entity_type', 'MANUFACTURER'),
      loadSuggestionCatalog()
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

    const revendasClientes = dedupeRevendasClientes([
      ...(clientsResult.data || [])
        .map((client) => toClientOption(client))
        .filter((item): item is RevendaClienteOption => !!item),
      ...(branchesResult.data || [])
        .filter((branch) => isRealBranch(branch))
        .map((branch) => toBranchOption(branch))
        .filter((item): item is RevendaClienteOption => !!item)
    ]);

    const fabricantes = uniqueSorted(
      (fabricantesResult.data || []).map((item) => norm(item?.name || item?.legal_name))
    );

    return jsonNoStore({
      revendasClientes,
      fabricantes,
      suggestions: suggestionData.catalog,
      suggestionItems: suggestionData.items
    });
  } catch (error) {
    console.error('Products references GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar referencias de produtos: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function POST() {
  return jsonNoStore(
    {
      error:
        'Use a pagina /home/cadastro-clientes para cadastrar novos clientes a partir do lookup de Revenda/Cliente.'
    },
    { status: 405 }
  );
}
