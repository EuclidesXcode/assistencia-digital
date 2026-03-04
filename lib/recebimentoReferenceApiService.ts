type RecebimentoNfReferencia = {
  id: string;
  codigoNf: string;
  modeloReferencia: string;
  ean: string;
  marca: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type CreateRecebimentoNfReferenciaInput = {
  codigoNf: string;
  modeloReferencia: string;
  ean?: string;
  marca?: string;
  createdBy?: string;
};

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `HTTP ${response.status}`;

  try {
    const data = JSON.parse(text);
    return data?.error || data?.message || text;
  } catch {
    const trimmed = text.trim();
    return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
  }
}

export class RecebimentoReferenceApiService {
  static async listNfReferencias(codigoNf?: string): Promise<RecebimentoNfReferencia[]> {
    const params = new URLSearchParams();
    const code = String(codigoNf || '').replace(/\D/g, '');
    if (code) params.set('codigoNf', code);

    const response = await fetch(`/api/recebimento/references${params.size ? `?${params.toString()}` : ''}`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar referencias de NF do recebimento.');
    }

    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  }

  static async saveNfReferencia(input: CreateRecebimentoNfReferenciaInput): Promise<RecebimentoNfReferencia> {
    const response = await fetch('/api/recebimento/references', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao salvar referencia de NF do recebimento.');
    }

    const payload = await response.json();
    if (!payload?.data?.codigoNf) {
      throw new Error('Resposta invalida ao salvar referencia de NF.');
    }

    return payload.data as RecebimentoNfReferencia;
  }
}

export type { RecebimentoNfReferencia, CreateRecebimentoNfReferenciaInput };

