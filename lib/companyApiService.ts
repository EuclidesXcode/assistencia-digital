export type CompanyAddressInput = {
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

export type CompanyOwnerInput = {
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
};

export type CompanyRecord = {
  id: string;
  ownerId: string;
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
  owner: CompanyOwnerInput | null;
  address: CompanyAddressInput | null;
};

export type CreateCompanyInput = {
  legalName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  businessActivity?: string;
  cnae?: string;
  owner?: CompanyOwnerInput;
  address?: CompanyAddressInput;
};

export type UpdateCompanyInput = CreateCompanyInput;

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

export class CompanyApiService {
  static async listCompanies(): Promise<CompanyRecord[]> {
    const response = await fetch('/api/companies', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao buscar empresas.');
    }

    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
  }

  static async createCompany(input: CreateCompanyInput): Promise<CompanyRecord> {
    const response = await fetch('/api/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao cadastrar empresa.');
    }

    const data = await response.json();
    if (!data?.data?.id) {
      throw new Error('Resposta invalida ao cadastrar empresa.');
    }

    return data.data as CompanyRecord;
  }

  static async updateCompany(id: string, input: UpdateCompanyInput): Promise<CompanyRecord> {
    const response = await fetch('/api/companies', {
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
      throw new Error(message || 'Falha ao alterar empresa.');
    }

    const data = await response.json();
    if (!data?.data?.id) {
      throw new Error('Resposta invalida ao alterar empresa.');
    }

    return data.data as CompanyRecord;
  }

  static async deleteCompany(id: string): Promise<void> {
    const value = String(id || '').trim();
    if (!value) {
      throw new Error('ID da empresa obrigatorio para exclusao.');
    }

    const params = new URLSearchParams({ id: value });
    const response = await fetch(`/api/companies?${params.toString()}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new Error(message || 'Falha ao excluir empresa.');
    }
  }
}
