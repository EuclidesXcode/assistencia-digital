export type ClientPersonType = 'COMPANY' | 'INDIVIDUAL';

export type ClientAddressInput = {
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  mainEmail?: string;
  mainMobile?: string;
  mainPhone?: string;
};

export type ClientRecord = {
  id: string;
  ownerId: string;
  personType: ClientPersonType;
  nome: string;
  fullName: string;
  cpf: string;
  rg: string;
  birthDate: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string;
  municipalRegistration: string;
  businessActivity: string;
  cnae: string;
  addressId: string;
  createdAt: string;
  updatedAt: string;
  address: ClientAddressInput | null;
};

export type CreateClientInput = {
  personType: ClientPersonType;
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  legalName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  businessActivity?: string;
  cnae?: string;
  address?: ClientAddressInput;
};

export type UpdateClientInput = CreateClientInput;

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  if (!text) {
    return `HTTP ${response.status}`;
  }

  try {
    const data = JSON.parse(text);
    return data?.error || data?.message || text;
  } catch {
    const trimmed = text.trim();
    return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
  }
}

export class ClientApiService {
  static async listClients(): Promise<ClientRecord[]> {
    const response = await fetch('/api/clients', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar clientes.');
    }

    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
  }

  static async createClient(input: CreateClientInput): Promise<ClientRecord> {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao cadastrar cliente.');
    }

    const data = await response.json();
    if (!data?.data?.id) {
      throw new Error('Resposta invalida ao cadastrar cliente.');
    }

    return data.data as ClientRecord;
  }

  static async updateClient(id: string, input: UpdateClientInput): Promise<ClientRecord> {
    const response = await fetch('/api/clients', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: String(id || '').trim(),
        ...input
      })
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao alterar cliente.');
    }

    const data = await response.json();
    if (!data?.data?.id) {
      throw new Error('Resposta invalida ao alterar cliente.');
    }

    return data.data as ClientRecord;
  }

  static async deleteClient(id: string): Promise<void> {
    const value = String(id || '').trim();
    if (!value) {
      throw new Error('ID do cliente obrigatorio para exclusao.');
    }

    const params = new URLSearchParams({ id: value });
    const response = await fetch(`/api/clients?${params.toString()}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao excluir cliente.');
    }
  }
}
