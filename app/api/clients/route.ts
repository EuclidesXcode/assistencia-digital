import { NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type ClientPersonType = 'COMPANY' | 'INDIVIDUAL';

type AddressInput = {
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

type CreateClientPayload = {
  personType?: ClientPersonType;
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
  address?: AddressInput;
};

type UpdateClientPayload = CreateClientPayload & {
  id?: string;
};

function norm(value: unknown) {
  return String(value || '').trim();
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
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

function getSafeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || 'Erro desconhecido');
  const trimmed = raw.trim();
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}...` : trimmed;
}

function hasAddressPayload(address?: AddressInput | null) {
  if (!address) return false;

  return [
    address.zipCode,
    address.street,
    address.number,
    address.complement,
    address.district,
    address.city,
    address.state,
    address.mainEmail,
    address.mainMobile,
    address.mainPhone
  ].some((value) => !!norm(value));
}

function mapAddressRecord(address: any) {
  if (!address) return null;

  return {
    id: norm(address?.id),
    zipCode: norm(address?.zip_code),
    street: norm(address?.street),
    number: norm(address?.number),
    complement: norm(address?.complement),
    district: norm(address?.district),
    city: norm(address?.city),
    state: upper(address?.state),
    mainEmail: norm(address?.main_email),
    mainMobile: norm(address?.main_mobile),
    mainPhone: norm(address?.main_phone)
  };
}

function mapClientRecord(client: any, address?: any) {
  const personType = upper(client?.person_type) === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';
  const nome =
    personType === 'COMPANY'
      ? norm(client?.trade_name || client?.legal_name)
      : norm(client?.full_name);

  return {
    id: norm(client?.id),
    ownerId: norm(client?.owner_id),
    personType,
    nome,
    fullName: norm(client?.full_name),
    cpf: norm(client?.cpf),
    rg: norm(client?.rg),
    birthDate: norm(client?.birth_date),
    legalName: norm(client?.legal_name),
    tradeName: norm(client?.trade_name),
    cnpj: norm(client?.cnpj),
    stateRegistration: norm(client?.state_registration),
    municipalRegistration: norm(client?.municipal_registration),
    businessActivity: norm(client?.business_activity),
    cnae: norm(client?.cnae),
    addressId: norm(client?.address_id),
    createdAt: norm(client?.created_at),
    updatedAt: norm(client?.updated_at),
    address: mapAddressRecord(address)
  };
}

async function loadAddressById(addressId: string) {
  const id = norm(addressId);
  if (!id) return null;

  const { data, error } = await supabaseAdmin
    .from('addresses')
    .select(
      'id, zip_code, street, number, complement, district, city, state, main_email, main_mobile, main_phone, created_at, updated_at'
    )
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

async function deleteAddressIfOrphan(addressId: string, ignoreClientId?: string) {
  const id = norm(addressId);
  if (!id) return;

  const clientsQuery = supabaseAdmin.from('clients').select('id').eq('address_id', id).limit(1);
  const clientsQueryFiltered = ignoreClientId ? clientsQuery.neq('id', ignoreClientId) : clientsQuery;
  const { data: clientRef, error: clientRefError } = await clientsQueryFiltered.maybeSingle();
  if (clientRefError) {
    throw new Error(clientRefError.message);
  }

  const { data: companyRef, error: companyRefError } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('address_id', id)
    .limit(1)
    .maybeSingle();
  if (companyRefError) {
    throw new Error(companyRefError.message);
  }

  const { data: branchRef, error: branchRefError } = await supabaseAdmin
    .from('branches')
    .select('id')
    .eq('address_id', id)
    .limit(1)
    .maybeSingle();
  if (branchRefError) {
    throw new Error(branchRefError.message);
  }

  const hasReference = Boolean(clientRef?.id || companyRef?.id || branchRef?.id);
  if (!hasReference) {
    const { error: deleteAddressError } = await supabaseAdmin.from('addresses').delete().eq('id', id);
    if (deleteAddressError) {
      throw new Error(deleteAddressError.message);
    }
  }
}

async function resolveDefaultOwnerId() {
  const { data: firstCompany, error: firstCompanyError } = await supabaseAdmin
    .from('companies')
    .select('owner_id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstCompanyError) {
    throw new Error(firstCompanyError.message);
  }

  if (firstCompany?.owner_id) {
    return String(firstCompany.owner_id);
  }

  const { data: firstOwner, error: firstOwnerError } = await supabaseAdmin
    .from('owners')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstOwnerError) {
    throw new Error(firstOwnerError.message);
  }

  return norm(firstOwner?.id) || null;
}

export async function GET() {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select(
        'id, owner_id, person_type, full_name, cpf, rg, birth_date, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .order('created_at', { ascending: false });

    if (clientsError) {
      return jsonNoStore({ error: clientsError.message }, { status: 500 });
    }

    const addressIds = Array.from(
      new Set((clients || []).map((client) => norm(client?.address_id)).filter(Boolean))
    );

    const addressMap = new Map<string, any>();

    if (addressIds.length > 0) {
      const { data: addresses, error: addressesError } = await supabaseAdmin
        .from('addresses')
        .select(
          'id, zip_code, street, number, complement, district, city, state, main_email, main_mobile, main_phone, created_at, updated_at'
        )
        .in('id', addressIds);

      if (addressesError) {
        return jsonNoStore({ error: addressesError.message }, { status: 500 });
      }

      (addresses || []).forEach((address) => {
        const id = norm(address?.id);
        if (id) addressMap.set(id, address);
      });
    }

    return jsonNoStore({
      data: (clients || []).map((client) => mapClientRecord(client, addressMap.get(norm(client?.address_id))))
    });
  } catch (error) {
    console.error('Clients GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar clientes: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  let createdAddressId: string | null = null;

  try {
    const body = (await request.json()) as CreateClientPayload;
    const personType = upper(body?.personType) === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';

    const fullName = norm(body?.fullName);
    const cpf = norm(body?.cpf);
    const rg = norm(body?.rg);
    const birthDate = norm(body?.birthDate);
    const legalName = norm(body?.legalName);
    const tradeName = norm(body?.tradeName);
    const cnpj = norm(body?.cnpj);
    const stateRegistration = norm(body?.stateRegistration);
    const municipalRegistration = norm(body?.municipalRegistration);
    const businessActivity = norm(body?.businessActivity);
    const cnae = norm(body?.cnae);
    const address = body?.address || {};

    if (personType === 'COMPANY') {
      if (!legalName && !tradeName) {
        return jsonNoStore({ error: 'Informe razao social ou nome fantasia.' }, { status: 400 });
      }
      if (!cnpj) {
        return jsonNoStore({ error: 'Informe o CNPJ do cliente juridico.' }, { status: 400 });
      }
    }

    if (personType === 'INDIVIDUAL') {
      if (!fullName) {
        return jsonNoStore({ error: 'Informe o nome completo do cliente fisico.' }, { status: 400 });
      }
      if (!cpf) {
        return jsonNoStore({ error: 'Informe o CPF do cliente fisico.' }, { status: 400 });
      }
    }

    if (cnpj) {
      const { data: existingCompany, error: existingCompanyError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('cnpj', cnpj)
        .limit(1)
        .maybeSingle();

      if (existingCompanyError) {
        return jsonNoStore({ error: existingCompanyError.message }, { status: 500 });
      }

      if (existingCompany?.id) {
        return jsonNoStore({ error: 'Ja existe cliente cadastrado com este CNPJ.' }, { status: 409 });
      }
    }

    if (cpf) {
      const { data: existingIndividual, error: existingIndividualError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('cpf', cpf)
        .limit(1)
        .maybeSingle();

      if (existingIndividualError) {
        return jsonNoStore({ error: existingIndividualError.message }, { status: 500 });
      }

      if (existingIndividual?.id) {
        return jsonNoStore({ error: 'Ja existe cliente cadastrado com este CPF.' }, { status: 409 });
      }
    }

    const ownerId = await resolveDefaultOwnerId();
    if (!ownerId) {
      return jsonNoStore(
        { error: 'Nao foi possivel resolver owner_id padrao para este cliente.' },
        { status: 400 }
      );
    }

    if (hasAddressPayload(address)) {
      const { data: createdAddress, error: addressError } = await supabaseAdmin
        .from('addresses')
        .insert([
          {
            zip_code: norm(address.zipCode) || null,
            street: norm(address.street) || null,
            number: norm(address.number) || null,
            complement: norm(address.complement) || null,
            district: norm(address.district) || null,
            city: norm(address.city) || null,
            state: upper(address.state) || null,
            main_email: norm(address.mainEmail) || null,
            main_mobile: norm(address.mainMobile) || null,
            main_phone: norm(address.mainPhone) || null
          }
        ])
        .select(
          'id, zip_code, street, number, complement, district, city, state, main_email, main_mobile, main_phone'
        )
        .single();

      if (addressError) {
        return jsonNoStore({ error: addressError.message }, { status: 500 });
      }

      createdAddressId = norm(createdAddress?.id) || null;
    }

    const { data: createdClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([
        {
          owner_id: ownerId,
          person_type: personType,
          full_name: personType === 'INDIVIDUAL' ? fullName : null,
          cpf: personType === 'INDIVIDUAL' ? cpf || null : null,
          rg: personType === 'INDIVIDUAL' ? rg || null : null,
          birth_date: personType === 'INDIVIDUAL' ? birthDate || null : null,
          legal_name: personType === 'COMPANY' ? legalName || tradeName || null : null,
          trade_name: personType === 'COMPANY' ? tradeName || legalName || null : null,
          cnpj: personType === 'COMPANY' ? cnpj || null : null,
          state_registration: personType === 'COMPANY' ? stateRegistration || null : null,
          municipal_registration: personType === 'COMPANY' ? municipalRegistration || null : null,
          business_activity: personType === 'COMPANY' ? businessActivity || null : null,
          cnae: personType === 'COMPANY' ? cnae || null : null,
          address_id: createdAddressId
        }
      ])
      .select(
        'id, owner_id, person_type, full_name, cpf, rg, birth_date, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .single();

    if (clientError) {
      if (createdAddressId) {
        await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
      }
      return jsonNoStore({ error: clientError.message }, { status: 500 });
    }

    const addressRecord = createdAddressId
      ? (
          await supabaseAdmin
            .from('addresses')
            .select(
              'id, zip_code, street, number, complement, district, city, state, main_email, main_mobile, main_phone, created_at, updated_at'
            )
            .eq('id', createdAddressId)
            .limit(1)
            .maybeSingle()
        ).data
      : null;

    return jsonNoStore({ data: mapClientRecord(createdClient, addressRecord) }, { status: 201 });
  } catch (error) {
    if (createdAddressId) {
      await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
    }

    console.error('Clients POST error:', error);
    return jsonNoStore(
      { error: `Erro ao cadastrar cliente: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  let createdAddressId: string | null = null;

  try {
    const body = (await request.json()) as UpdateClientPayload;
    const id = norm(body?.id);

    if (!id) {
      return jsonNoStore({ error: 'ID do cliente obrigatorio para alteracao.' }, { status: 400 });
    }

    const { data: existingClient, error: existingClientError } = await supabaseAdmin
      .from('clients')
      .select(
        'id, owner_id, person_type, full_name, cpf, rg, birth_date, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (existingClientError) {
      return jsonNoStore({ error: existingClientError.message }, { status: 500 });
    }

    if (!existingClient?.id) {
      return jsonNoStore({ error: 'Cliente nao encontrado para alteracao.' }, { status: 404 });
    }

    const personType =
      upper(body?.personType || existingClient?.person_type) === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';

    const fullName = norm(body?.fullName ?? existingClient?.full_name);
    const cpf = norm(body?.cpf ?? existingClient?.cpf);
    const rg = norm(body?.rg ?? existingClient?.rg);
    const birthDate = norm(body?.birthDate ?? existingClient?.birth_date);
    const legalName = norm(body?.legalName ?? existingClient?.legal_name);
    const tradeName = norm(body?.tradeName ?? existingClient?.trade_name);
    const cnpj = norm(body?.cnpj ?? existingClient?.cnpj);
    const stateRegistration = norm(body?.stateRegistration ?? existingClient?.state_registration);
    const municipalRegistration = norm(body?.municipalRegistration ?? existingClient?.municipal_registration);
    const businessActivity = norm(body?.businessActivity ?? existingClient?.business_activity);
    const cnae = norm(body?.cnae ?? existingClient?.cnae);

    if (personType === 'COMPANY') {
      if (!legalName && !tradeName) {
        return jsonNoStore({ error: 'Informe razao social ou nome fantasia.' }, { status: 400 });
      }
      if (!cnpj) {
        return jsonNoStore({ error: 'Informe o CNPJ do cliente juridico.' }, { status: 400 });
      }
    }

    if (personType === 'INDIVIDUAL') {
      if (!fullName) {
        return jsonNoStore({ error: 'Informe o nome completo do cliente fisico.' }, { status: 400 });
      }
      if (!cpf) {
        return jsonNoStore({ error: 'Informe o CPF do cliente fisico.' }, { status: 400 });
      }
    }

    if (cnpj) {
      const { data: duplicateCnpj, error: duplicateCnpjError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('cnpj', cnpj)
        .neq('id', id)
        .limit(1)
        .maybeSingle();

      if (duplicateCnpjError) {
        return jsonNoStore({ error: duplicateCnpjError.message }, { status: 500 });
      }

      if (duplicateCnpj?.id) {
        return jsonNoStore({ error: 'Ja existe cliente cadastrado com este CNPJ.' }, { status: 409 });
      }
    }

    if (cpf) {
      const { data: duplicateCpf, error: duplicateCpfError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('cpf', cpf)
        .neq('id', id)
        .limit(1)
        .maybeSingle();

      if (duplicateCpfError) {
        return jsonNoStore({ error: duplicateCpfError.message }, { status: 500 });
      }

      if (duplicateCpf?.id) {
        return jsonNoStore({ error: 'Ja existe cliente cadastrado com este CPF.' }, { status: 409 });
      }
    }

    const previousAddressId = norm(existingClient?.address_id) || null;
    let nextAddressId = previousAddressId;

    const payloadAddress = body?.address;
    if (payloadAddress && hasAddressPayload(payloadAddress)) {
      if (nextAddressId) {
        const { error: updateAddressError } = await supabaseAdmin
          .from('addresses')
          .update({
            zip_code: norm(payloadAddress.zipCode) || null,
            street: norm(payloadAddress.street) || null,
            number: norm(payloadAddress.number) || null,
            complement: norm(payloadAddress.complement) || null,
            district: norm(payloadAddress.district) || null,
            city: norm(payloadAddress.city) || null,
            state: upper(payloadAddress.state) || null,
            main_email: norm(payloadAddress.mainEmail) || null,
            main_mobile: norm(payloadAddress.mainMobile) || null,
            main_phone: norm(payloadAddress.mainPhone) || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', nextAddressId);

        if (updateAddressError) {
          return jsonNoStore({ error: updateAddressError.message }, { status: 500 });
        }
      } else {
        const { data: createdAddress, error: createAddressError } = await supabaseAdmin
          .from('addresses')
          .insert([
            {
              zip_code: norm(payloadAddress.zipCode) || null,
              street: norm(payloadAddress.street) || null,
              number: norm(payloadAddress.number) || null,
              complement: norm(payloadAddress.complement) || null,
              district: norm(payloadAddress.district) || null,
              city: norm(payloadAddress.city) || null,
              state: upper(payloadAddress.state) || null,
              main_email: norm(payloadAddress.mainEmail) || null,
              main_mobile: norm(payloadAddress.mainMobile) || null,
              main_phone: norm(payloadAddress.mainPhone) || null
            }
          ])
          .select('id')
          .single();

        if (createAddressError) {
          return jsonNoStore({ error: createAddressError.message }, { status: 500 });
        }

        createdAddressId = norm(createdAddress?.id) || null;
        nextAddressId = createdAddressId;
      }
    } else if (payloadAddress && !hasAddressPayload(payloadAddress)) {
      nextAddressId = null;
    }

    const { data: updatedClient, error: updateClientError } = await supabaseAdmin
      .from('clients')
      .update({
        person_type: personType,
        full_name: personType === 'INDIVIDUAL' ? fullName || null : null,
        cpf: personType === 'INDIVIDUAL' ? cpf || null : null,
        rg: personType === 'INDIVIDUAL' ? rg || null : null,
        birth_date: personType === 'INDIVIDUAL' ? birthDate || null : null,
        legal_name: personType === 'COMPANY' ? legalName || tradeName || null : null,
        trade_name: personType === 'COMPANY' ? tradeName || legalName || null : null,
        cnpj: personType === 'COMPANY' ? cnpj || null : null,
        state_registration: personType === 'COMPANY' ? stateRegistration || null : null,
        municipal_registration: personType === 'COMPANY' ? municipalRegistration || null : null,
        business_activity: personType === 'COMPANY' ? businessActivity || null : null,
        cnae: personType === 'COMPANY' ? cnae || null : null,
        address_id: nextAddressId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(
        'id, owner_id, person_type, full_name, cpf, rg, birth_date, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .maybeSingle();

    if (updateClientError) {
      if (createdAddressId) {
        await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
      }
      return jsonNoStore({ error: updateClientError.message }, { status: 500 });
    }

    if (!updatedClient?.id) {
      if (createdAddressId) {
        await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
      }
      return jsonNoStore({ error: 'Cliente nao encontrado para alteracao.' }, { status: 404 });
    }

    if (previousAddressId && previousAddressId !== nextAddressId) {
      await deleteAddressIfOrphan(previousAddressId, id);
    }

    const addressRecord = nextAddressId ? await loadAddressById(nextAddressId) : null;
    return jsonNoStore({ data: mapClientRecord(updatedClient, addressRecord) });
  } catch (error) {
    if (createdAddressId) {
      await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
    }

    console.error('Clients PATCH error:', error);
    return jsonNoStore(
      { error: `Erro ao alterar cliente: ${getSafeErrorMessage(error)}` },
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
      return jsonNoStore({ error: 'ID do cliente obrigatorio para exclusao.' }, { status: 400 });
    }

    const { data: existingClient, error: existingClientError } = await supabaseAdmin
      .from('clients')
      .select('id, address_id')
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (existingClientError) {
      return jsonNoStore({ error: existingClientError.message }, { status: 500 });
    }

    if (!existingClient?.id) {
      return jsonNoStore({ error: 'Cliente nao encontrado para exclusao.' }, { status: 404 });
    }

    const addressId = norm(existingClient?.address_id);

    const { error: deleteClientError } = await supabaseAdmin.from('clients').delete().eq('id', id);
    if (deleteClientError) {
      return jsonNoStore({ error: deleteClientError.message }, { status: 500 });
    }

    if (addressId) {
      await deleteAddressIfOrphan(addressId);
    }

    return jsonNoStore({ ok: true, id });
  } catch (error) {
    console.error('Clients DELETE error:', error);
    return jsonNoStore(
      { error: `Erro ao excluir cliente: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
