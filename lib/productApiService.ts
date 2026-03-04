import { CreateProductDTO } from '@/backend/models/Product';
import {
  ProductReferenceSuggestionItem,
  ProductSuggestionCatalog,
  ProductSuggestionCategory
} from '@/lib/productReferenceCatalog';

type ProductSearchResponse = {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ProductReferencesResponse = {
  revendasClientes: Array<{
    id: string;
    nome: string;
    tipo: string;
    documento: string;
    origem: 'CLIENTE' | 'FILIAL';
  }>;
  fabricantes: string[];
  suggestions: ProductSuggestionCatalog;
  suggestionItems: ProductReferenceSuggestionItem[];
};

type UpdateProductMasterDTO = {
  id?: string;
  originalEan?: string;
  ean: string;
  modeloRef: string;
  marca: string;
};

type UpdateProductDTO = CreateProductDTO & {
  id?: string;
  originalEan?: string;
};

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  if (!text) {
    return `HTTP ${response.status}`;
  }

  try {
    const data = JSON.parse(text);
    return data?.error || data?.message || text;
  } catch {
    if (/<(html|!doctype)/i.test(text)) {
      const nextErrorMessage = text.match(/"message":"([^"]+)"/)?.[1];
      if (nextErrorMessage) {
        return nextErrorMessage.replace(/\\n/g, ' ').trim();
      }

      const supabaseConfigMessage = text.match(
        /Missing Supabase server configuration\.[^"\\<]*/i
      )?.[0];
      if (supabaseConfigMessage) {
        return supabaseConfigMessage.trim();
      }

      return `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    }

    const trimmed = text.trim();
    return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
  }
}

export class ProductApiService {
  static async createProduct(data: CreateProductDTO): Promise<{ id: string | null }> {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao cadastrar produto.');
    }

    try {
      const payload = await response.json();
      return { id: payload?.id ? String(payload.id) : null };
    } catch {
      return { id: null };
    }
  }

  static async searchProducts(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ProductSearchResponse> {
    if (!query || query.trim().length < 3) {
      return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
    }

    const params = new URLSearchParams({
      q: query.trim(),
      page: String(page),
      pageSize: String(pageSize)
    });

    const response = await fetch(`/api/products?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar produtos.');
    }

    const data = await response.json();
    return {
      data: Array.isArray(data?.data) ? data.data : [],
      total: Number(data?.total || 0),
      page: Number(data?.page || 1),
      pageSize: Number(data?.pageSize || pageSize),
      totalPages: Number(data?.totalPages || 0)
    };
  }

  static async getLatestProducts(limit: number = 10): Promise<any[]> {
    const params = new URLSearchParams({
      limit: String(limit)
    });

    const response = await fetch(`/api/products?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar ultimos produtos.');
    }

    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
  }

  static async getProductByEan(ean: string): Promise<any | null> {
    const value = String(ean || '').trim();
    if (!value) return null;

    const params = new URLSearchParams({
      ean: value
    });

    const response = await fetch(`/api/products/lookup?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar produto por EAN.');
    }

    return response.json();
  }

  static async updateProductMaster(data: UpdateProductMasterDTO): Promise<void> {
    const payload = {
      id: String(data?.id || '').trim(),
      originalEan: String(data?.originalEan || '').trim(),
      ean: String(data?.ean || '').trim(),
      modeloRef: String(data?.modeloRef || '').trim(),
      marca: String(data?.marca || '').trim()
    };

    const response = await fetch('/api/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao alterar produto.');
    }
  }

  static async updateProduct(data: UpdateProductDTO): Promise<{ id: string | null; ean: string | null }> {
    const response = await fetch('/api/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao atualizar produto.');
    }

    try {
      const payload = await response.json();
      return {
        id: payload?.id ? String(payload.id) : null,
        ean: payload?.ean ? String(payload.ean) : null
      };
    } catch {
      return { id: null, ean: null };
    }
  }

  static async deleteProductByEan(ean: string): Promise<void> {
    const value = String(ean || '').trim();
    if (!value) {
      throw new Error('EAN obrigatorio para exclusao.');
    }

    const params = new URLSearchParams({ ean: value });
    const response = await fetch(`/api/products?${params.toString()}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao excluir produto.');
    }
  }

  static async deleteProductById(id: string): Promise<void> {
    const value = String(id || '').trim();
    if (!value) {
      throw new Error('ID obrigatorio para exclusao.');
    }

    const params = new URLSearchParams({ id: value });
    const response = await fetch(`/api/products?${params.toString()}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao excluir produto.');
    }
  }

  static async getReferences(): Promise<ProductReferencesResponse> {
    const response = await fetch('/api/products/references', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar referencias do cadastro de produtos.');
    }

    const data = await response.json();
    return {
      revendasClientes: Array.isArray(data?.revendasClientes) ? data.revendasClientes : [],
      fabricantes: Array.isArray(data?.fabricantes) ? data.fabricantes : [],
      suggestions: data?.suggestions || {
        linhas: [],
        funcionalidades: [],
        esteticas: [],
        embalagens: [],
        acessorios: [],
        pecas_funcionais: []
      },
      suggestionItems: Array.isArray(data?.suggestionItems) ? data.suggestionItems : []
    };
  }

  static async createReferenceSuggestion(
    category: ProductSuggestionCategory,
    value: string
  ): Promise<{
    id: string;
    category: ProductSuggestionCategory;
    value: string;
    alreadyExisted: boolean;
    suggestion: ProductReferenceSuggestionItem;
  }> {
    const response = await fetch('/api/products/reference-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category,
        value: String(value || '').trim()
      })
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao cadastrar sugestao.');
    }

    const data = await response.json();
    const suggestion = data?.suggestion;
    if (!data?.category || !data?.value || !suggestion?.id) {
      throw new Error('Resposta invalida ao cadastrar sugestao.');
    }

    return {
      id: String(suggestion.id),
      category: data.category as ProductSuggestionCategory,
      value: String(data.value),
      alreadyExisted: Boolean(data.alreadyExisted),
      suggestion: {
        id: String(suggestion.id),
        category: data.category as ProductSuggestionCategory,
        value: String(suggestion.value || data.value)
      }
    };
  }

  static async listReferenceSuggestions(
    category?: ProductSuggestionCategory
  ): Promise<ProductReferenceSuggestionItem[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);

    const response = await fetch(
      `/api/products/reference-suggestions${params.size ? `?${params.toString()}` : ''}`,
      {
        method: 'GET',
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao listar sugestoes.');
    }

    const data = await response.json();
    return Array.isArray(data?.data)
      ? data.data
          .map((item: any) => ({
            id: String(item?.id || '').trim(),
            category: String(item?.category || '').trim() as ProductSuggestionCategory,
            value: String(item?.value || '').trim()
          }))
          .filter((item: ProductReferenceSuggestionItem) => !!item.id && !!item.category && !!item.value)
      : [];
  }

  static async updateReferenceSuggestion(
    id: string,
    category: ProductSuggestionCategory,
    value: string
  ): Promise<ProductReferenceSuggestionItem> {
    const response = await fetch('/api/products/reference-suggestions', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: String(id || '').trim(),
        category,
        value: String(value || '').trim()
      })
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao alterar sugestao.');
    }

    const data = await response.json();
    const suggestion = data?.suggestion;
    if (!suggestion?.id || !suggestion?.category || !suggestion?.value) {
      throw new Error('Resposta invalida ao alterar sugestao.');
    }

    return {
      id: String(suggestion.id),
      category: String(suggestion.category) as ProductSuggestionCategory,
      value: String(suggestion.value)
    };
  }

  static async deleteReferenceSuggestion(id: string): Promise<void> {
    const params = new URLSearchParams({
      id: String(id || '').trim()
    });

    const response = await fetch(`/api/products/reference-suggestions?${params.toString()}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao excluir sugestao.');
    };
  }
}
