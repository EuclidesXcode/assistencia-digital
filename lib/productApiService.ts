import { CreateProductDTO } from '@/backend/models/Product';

type ProductSearchResponse = {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  static async createProduct(data: CreateProductDTO): Promise<void> {
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
      method: 'GET'
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
      method: 'GET'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar ultimos produtos.');
    }

    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
  }
}
