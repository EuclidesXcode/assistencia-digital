import { NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type RevendaClienteOption = {
  id: string;
  nome: string;
  tipo: string;
  documento: string;
  origem: 'CLIENTE' | 'FILIAL';
};

type CreateRevendaPayload = {
  nome?: string;
  documento?: string;
};

function norm(value: unknown) {
  return String(value || '').trim();
}

function digitsOnly(value: unknown) {
  return norm(value).replace(/\D/g, '');
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => norm(value)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
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

function buildBranchDocumentPayload(documento: string) {
  const digits = digitsOnly(documento);
  if (!digits) {
    return {
      cnpj: null,
      branch_code: null
    };
  }

  if (digits.length === 14) {
    return {
      cnpj: documento,
      branch_code: null
    };
  }

  return {
    cnpj: null,
    branch_code: documento
  };
}

async function resolveDefaultCompanyId() {
  const { data: headquarters, error: headquartersError } = await supabaseAdmin
    .from('branches')
    .select('company_id')
    .eq('is_headquarters', true)
    .not('company_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (headquartersError) {
    throw new Error(headquartersError.message);
  }

  if (headquarters?.company_id) {
    const { data: companyByHq, error: companyByHqError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', headquarters.company_id)
      .limit(1)
      .maybeSingle();

    if (companyByHqError) {
      throw new Error(companyByHqError.message);
    }

    if (companyByHq?.id) {
      return String(companyByHq.id);
    }
  }

  const { data: firstCompany, error: firstCompanyError } = await supabaseAdmin
    .from('companies')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstCompanyError) {
    throw new Error(firstCompanyError.message);
  }

  return norm(firstCompany?.id) || null;
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

    if (current.origem !== 'FILIAL' && option.origem === 'FILIAL') {
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

export async function GET() {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const [clientsResult, branchesResult, fabricantesResult] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('id, person_type, trade_name, legal_name, full_name, cnpj, cpf'),
      supabaseAdmin
        .from('branches')
        .select('id, branch_name, cnpj, branch_code, company_id, client_id, is_headquarters'),
      supabaseAdmin
        .from('entities')
        .select('id, name, legal_name')
        .eq('entity_type', 'MANUFACTURER')
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
      fabricantes
    });
  } catch (error) {
    console.error('Products references GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar referencias de produtos: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const body = (await request.json()) as CreateRevendaPayload;
    const nome = norm(body?.nome);
    const documento = norm(body?.documento);
    const documentPayload = buildBranchDocumentPayload(documento);

    if (!nome) {
      return jsonNoStore({ error: 'Nome da revenda obrigatorio.' }, { status: 400 });
    }

    const { data: existingBranch, error: existingBranchError } = await supabaseAdmin
      .from('branches')
      .select('id, branch_name, cnpj, branch_code, company_id, client_id, is_headquarters')
      .ilike('branch_name', nome)
      .limit(1)
      .maybeSingle();

    if (existingBranchError) {
      return jsonNoStore({ error: existingBranchError.message }, { status: 500 });
    }

    const existingOption = isRealBranch(existingBranch) ? toBranchOption(existingBranch) : null;
    if (existingOption) {
      if (existingBranch?.id && documento && !norm(existingBranch?.cnpj || existingBranch?.branch_code)) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('branches')
          .update(documentPayload.cnpj ? { cnpj: documentPayload.cnpj } : { branch_code: documento })
          .eq('id', existingBranch.id)
          .select('id, branch_name, cnpj, branch_code, company_id, client_id, is_headquarters')
          .single();

        if (updateError) {
          return jsonNoStore({ error: updateError.message }, { status: 500 });
        }

        const updatedOption = toBranchOption(updated);
        if (updatedOption) {
          return jsonNoStore({ option: updatedOption, alreadyExisted: true, updatedDocument: true });
        }
      }

      return jsonNoStore({ option: existingOption, alreadyExisted: true });
    }

    const companyId = await resolveDefaultCompanyId();
    if (!companyId) {
      return jsonNoStore(
        { error: 'Nao foi possivel resolver a empresa principal para vincular a revenda. Cadastre pela tela de empresas/filiais.' },
        { status: 400 }
      );
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from('branches')
      .insert([
        {
          company_id: companyId,
          client_id: null,
          branch_name: nome,
          is_headquarters: false,
          ...documentPayload
        }
      ])
      .select('id, branch_name, cnpj, branch_code, company_id, client_id, is_headquarters')
      .single();

    if (insertError) {
      return jsonNoStore({ error: insertError.message }, { status: 500 });
    }

    const option = toBranchOption(created);
    if (!option) {
      return jsonNoStore({ error: 'Falha ao montar revenda criada.' }, { status: 500 });
    }

    return jsonNoStore({ option, alreadyExisted: false }, { status: 201 });
  } catch (error) {
    console.error('Products references POST error:', error);
    return jsonNoStore(
      { error: `Erro ao cadastrar revenda: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
