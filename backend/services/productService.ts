import { supabase } from '@/lib/supabase';
import { CreateProductDTO } from '../models/Product';

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

function resolveBrand(data: any) {
  return (
    data.marca ??
    data.fabricante ??
    data.modelo_fabricante ??
    data.brand ??
    data.manufacturer ??
    null
  );
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
  const replacement = aliasCandidates.find((candidate) => !(candidate in payload));
  if (replacement) {
    payload[replacement] = payload[missingColumn];
  }

  delete payload[missingColumn];
  return true;
}

function isLikelyArrayColumn(column: string) {
  return (
    column === 'codigo_nf' ||
    column === 'modelo_fabricante' ||
    column === 'fotos' ||
    column === 'etiqueta_procel' ||
    column === 'kit_acessorio' ||
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
    'codigo_nf',
    'modelo_fabricante',
    'nfs_data',
    'modelos_data',
    'embalagem',
    'acessorios',
    'estetica',
    'funcional',
    'funcionalidade',
    'fotos',
    'etiqueta_procel',
    'kit_acessorio'
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

function buildSearchFilters(query: string) {
  return [
    `ean.ilike.%${query}%,modelo_ref.ilike.%${query}%,marca.ilike.%${query}%`,
    `ean.ilike.%${query}%,modelo_ref.ilike.%${query}%,fabricante.ilike.%${query}%`,
    `ean.ilike.%${query}%,modelo_ref.ilike.%${query}%,modelo_fabricante.ilike.%${query}%`,
    `ean.ilike.%${query}%,modelo_ref.ilike.%${query}%`
  ];
}

export class ProductService {
  static async createProduct(data: CreateProductDTO): Promise<void> {
    // Safety guard: if this service is imported by client code, use API route instead of direct Supabase.
    if (typeof window !== 'undefined') {
      const { ProductApiService } = await import('@/lib/productApiService');
      await ProductApiService.createProduct(data);
      return;
    }

    const nfs = Array.isArray(data.nfs) ? data.nfs : [];
    const modelos = Array.isArray(data.modelos) ? data.modelos : [];

    const firstCodigoNf =
      nfs.length > 0 && typeof (nfs[0] as any)?.codigo === 'string'
        ? String((nfs[0] as any).codigo).trim() || null
        : null;

    const firstModeloFabricante =
      modelos.length > 0 && typeof (modelos[0] as any)?.nome === 'string'
        ? String((modelos[0] as any).nome).trim() || null
        : data.modeloRef || null;

    const esteticaRoot = Array.isArray(data.estetica) ? data.estetica : [];
    const funcionalRoot = Array.isArray(data.funcional) ? data.funcional : [];
    const esteticaFromModelos = modelos.flatMap((modelo: any) =>
      Array.isArray(modelo?.estetica) ? modelo.estetica : []
    );
    const funcionalFromModelos = modelos.flatMap((modelo: any) =>
      Array.isArray(modelo?.funcional) ? modelo.funcional : []
    );
    const esteticaPayload = esteticaRoot.length > 0 ? esteticaRoot : esteticaFromModelos;
    const funcionalPayload = funcionalRoot.length > 0 ? funcionalRoot : funcionalFromModelos;

    const payload: Record<string, unknown> = {
      ean: data.ean,
      modelo_ref: data.modeloRef,
      marca: data.marca,
      fabricante: data.marca,
      modelo_fabricante: firstModeloFabricante,
      codigo_nf: firstCodigoNf,
      manual_url: data.manualUrl,
      fotos: Array.isArray(data.fotos) ? data.fotos : [],
      etiqueta_procel: Array.isArray(data.etiquetaProcel) ? data.etiquetaProcel : [],
      kit_acessorio: Array.isArray(data.kitAcessorio) ? data.kitAcessorio : [],
      nfs_data: nfs,
      modelos_data: modelos,
      embalagem: Array.isArray(data.embalagem) ? data.embalagem : [],
      acessorios: Array.isArray(data.acessorios) ? data.acessorios : [],
      estetica: esteticaPayload,
      funcional: funcionalPayload,
      funcionalidade: Array.isArray(data.funcionalidade) ? data.funcionalidade : [],
      estoque_atual: 0
    };

    let lastError: any = null;
    const payloadSignatures = new Set<string>();

    for (let attempt = 0; attempt < 20; attempt++) {
      const { error } = await supabase.from('produtos').insert([payload]);
      if (!error) {
        return;
      }

      lastError = error;
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
      console.error('Error creating product:', lastError);
      throw new Error('Erro ao salvar produto no banco de dados: ' + lastError.message);
    }
  }

  private static mapProduct(data: any): any {
    const brand = resolveBrand(data);

    return {
      id: data.id,
      ean: data.ean ?? data.gtin ?? '',
      modeloRef: data.modelo_ref ?? data.modelo ?? data.modelo_fabricante ?? '',
      marca: brand || 'N/A',
      nfs: data.nfs_data ?? data.nfs ?? [],
      modelos: data.modelos_data ?? data.modelos ?? [],
      embalagem: data.embalagem || [],
      acessorios: data.acessorios || [],
      estetica: data.estetica || [],
      funcional: data.funcional || [],
      funcionalidade: data.funcionalidade || [],
      fotos: data.fotos || [],
      etiquetaProcel: data.etiqueta_procel || [],
      kitAcessorio: data.kit_acessorio || [],
      manualUrl: data.manual_url ?? data.manual ?? null,
      estoqueAtual: data.estoque_atual ?? data.estoque ?? 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  static async findByEan(ean: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('ean', ean)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error finding product by EAN:', error);
      throw new Error('Erro ao buscar produto');
    }

    return data ? this.mapProduct(data) : null;
  }

  static async searchProducts(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    if (!query || query.length < 3) {
      return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let rows: any[] = [];
    let total = 0;
    let lastError: any = null;

    for (const filter of buildSearchFilters(query)) {
      const { data, error, count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact' })
        .or(filter)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (!error) {
        rows = data || [];
        total = count || 0;
        lastError = null;
        break;
      }

      lastError = error;
      if (!isMissingColumnError(error)) {
        break;
      }
    }

    if (lastError) {
      console.error('Error searching products:', lastError);
      return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
    }

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: rows.map((item: any) => this.mapProduct(item)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  static async getLatestProducts(): Promise<any[]> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching latest products:', error);
      return [];
    }

    return (data || []).map((item: any) => this.mapProduct(item));
  }
}
