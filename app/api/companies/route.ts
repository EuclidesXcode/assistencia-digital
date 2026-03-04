import { NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError
} from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

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

type OwnerInput = {
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
};

type CreateCompanyPayload = {
  legalName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  businessActivity?: string;
  cnae?: string;
  owner?: OwnerInput;
  address?: AddressInput;
};

type UpdateCompanyPayload = CreateCompanyPayload & {
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

function mapOwnerRecord(owner: any) {
  if (!owner) return null;

  return {
    id: norm(owner?.id),
    fullName: norm(owner?.full_name),
    cpf: norm(owner?.cpf),
    rg: norm(owner?.rg),
    birthDate: norm(owner?.birth_date)
  };
}

function mapCompanyRecord(company: any, owner?: any, address?: any) {
  return {
    id: norm(company?.id),
    ownerId: norm(company?.owner_id),
    legalName: norm(company?.legal_name),
    tradeName: norm(company?.trade_name),
    cnpj: norm(company?.cnpj),
    stateRegistration: norm(company?.state_registration),
    municipalRegistration: norm(company?.municipal_registration),
    businessActivity: norm(company?.business_activity),
    cnae: norm(company?.cnae),
    addressId: norm(company?.address_id),
    createdAt: norm(company?.created_at),
    updatedAt: norm(company?.updated_at),
    owner: mapOwnerRecord(owner),
    address: mapAddressRecord(address)
  };
}

async function loadOwnerById(ownerId: string) {
  const id = norm(ownerId);
  if (!id) return null;

  const { data, error } = await supabaseAdmin
    .from('owners')
    .select('id, full_name, cpf, rg, birth_date')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
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

async function deleteAddressIfOrphan(addressId: string) {
  const id = norm(addressId);
  if (!id) return;

  const { data: clientRef, error: clientRefError } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('address_id', id)
    .limit(1)
    .maybeSingle();
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

async function deleteOwnerIfOrphan(ownerId: string) {
  const id = norm(ownerId);
  if (!id) return;

  const { data: companyRef, error: companyRefError } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('owner_id', id)
    .limit(1)
    .maybeSingle();
  if (companyRefError) {
    throw new Error(companyRefError.message);
  }

  const { data: clientRef, error: clientRefError } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('owner_id', id)
    .limit(1)
    .maybeSingle();
  if (clientRefError) {
    throw new Error(clientRefError.message);
  }

  const hasReference = Boolean(companyRef?.id || clientRef?.id);
  if (!hasReference) {
    const { error: deleteOwnerError } = await supabaseAdmin.from('owners').delete().eq('id', id);
    if (deleteOwnerError) {
      throw new Error(deleteOwnerError.message);
    }
  }
}

async function safeDeleteOwnerIfOrphan(ownerId: string | null | undefined) {
  const id = norm(ownerId);
  if (!id) return;

  try {
    await deleteOwnerIfOrphan(id);
  } catch (cleanupError) {
    console.error('Companies owner cleanup error:', cleanupError);
  }
}

export async function GET() {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  try {
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select(
        'id, owner_id, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .order('created_at', { ascending: false });

    if (companiesError) {
      return jsonNoStore({ error: companiesError.message }, { status: 500 });
    }

    const ownerIds = Array.from(
      new Set((companies || []).map((company) => norm(company?.owner_id)).filter(Boolean))
    );
    const addressIds = Array.from(
      new Set((companies || []).map((company) => norm(company?.address_id)).filter(Boolean))
    );

    const ownerMap = new Map<string, any>();
    const addressMap = new Map<string, any>();

    if (ownerIds.length > 0) {
      const { data: owners, error: ownersError } = await supabaseAdmin
        .from('owners')
        .select('id, full_name, cpf, rg, birth_date')
        .in('id', ownerIds);

      if (ownersError) {
        return jsonNoStore({ error: ownersError.message }, { status: 500 });
      }

      (owners || []).forEach((owner) => {
        const id = norm(owner?.id);
        if (id) ownerMap.set(id, owner);
      });
    }

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
      data: (companies || []).map((company) =>
        mapCompanyRecord(company, ownerMap.get(norm(company?.owner_id)), addressMap.get(norm(company?.address_id)))
      )
    });
  } catch (error) {
    console.error('Companies GET error:', error);
    return jsonNoStore(
      { error: `Erro ao buscar empresas: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  let createdOwnerId: string | null = null;
  let createdAddressId: string | null = null;

  try {
    const body = (await request.json()) as CreateCompanyPayload;
    const legalName = norm(body?.legalName);
    const tradeName = norm(body?.tradeName);
    const cnpj = norm(body?.cnpj);
    const stateRegistration = norm(body?.stateRegistration);
    const municipalRegistration = norm(body?.municipalRegistration);
    const businessActivity = norm(body?.businessActivity);
    const cnae = norm(body?.cnae);

    const ownerFullName = norm(body?.owner?.fullName);
    const ownerCpf = norm(body?.owner?.cpf);
    const ownerRg = norm(body?.owner?.rg);
    const ownerBirthDate = norm(body?.owner?.birthDate);
    const address = body?.address || {};

    if (!legalName) {
      return jsonNoStore({ error: 'Informe a razao social da empresa.' }, { status: 400 });
    }

    if (!cnpj) {
      return jsonNoStore({ error: 'Informe o CNPJ da empresa.' }, { status: 400 });
    }

    if (!ownerFullName || !ownerCpf) {
      return jsonNoStore({ error: 'Informe nome e CPF do proprietario/responsavel.' }, { status: 400 });
    }

    const { data: existingCompany, error: existingCompanyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .limit(1)
      .maybeSingle();

    if (existingCompanyError) {
      return jsonNoStore({ error: existingCompanyError.message }, { status: 500 });
    }

    if (existingCompany?.id) {
      return jsonNoStore({ error: 'Ja existe empresa cadastrada com este CNPJ.' }, { status: 409 });
    }

    let ownerId = '';
    const { data: existingOwner, error: existingOwnerError } = await supabaseAdmin
      .from('owners')
      .select('id, full_name, cpf, rg, birth_date')
      .eq('cpf', ownerCpf)
      .limit(1)
      .maybeSingle();

    if (existingOwnerError) {
      return jsonNoStore({ error: existingOwnerError.message }, { status: 500 });
    }

    if (existingOwner?.id) {
      ownerId = norm(existingOwner.id);

      const shouldUpdateOwner =
        (!norm(existingOwner.full_name) && ownerFullName) ||
        (!norm(existingOwner.rg) && ownerRg) ||
        (!norm(existingOwner.birth_date) && ownerBirthDate);

      if (shouldUpdateOwner) {
        const { error: updateOwnerError } = await supabaseAdmin
          .from('owners')
          .update({
            full_name: ownerFullName || existingOwner.full_name,
            rg: ownerRg || existingOwner.rg || null,
            birth_date: ownerBirthDate || existingOwner.birth_date || null
          })
          .eq('id', ownerId);

        if (updateOwnerError) {
          return jsonNoStore({ error: updateOwnerError.message }, { status: 500 });
        }
      }
    } else {
      const { data: createdOwner, error: ownerError } = await supabaseAdmin
        .from('owners')
        .insert([
          {
            full_name: ownerFullName,
            cpf: ownerCpf,
            rg: ownerRg || null,
            birth_date: ownerBirthDate || null
          }
        ])
        .select('id')
        .single();

      if (ownerError) {
        return jsonNoStore({ error: ownerError.message }, { status: 500 });
      }

      ownerId = norm(createdOwner?.id);
      createdOwnerId = ownerId || null;
    }

    if (!ownerId) {
      return jsonNoStore({ error: 'Nao foi possivel resolver owner_id para a empresa.' }, { status: 500 });
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
        if (createdOwnerId) {
          await supabaseAdmin.from('owners').delete().eq('id', createdOwnerId);
        }
        return jsonNoStore({ error: addressError.message }, { status: 500 });
      }

      createdAddressId = norm(createdAddress?.id) || null;
    }

    const { data: createdCompany, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([
        {
          owner_id: ownerId,
          legal_name: legalName,
          trade_name: tradeName || null,
          cnpj,
          state_registration: stateRegistration || null,
          municipal_registration: municipalRegistration || null,
          business_activity: businessActivity || null,
          cnae: cnae || null,
          address_id: createdAddressId
        }
      ])
      .select(
        'id, owner_id, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .single();

    if (companyError) {
      if (createdAddressId) {
        await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
      }
      if (createdOwnerId) {
        await supabaseAdmin.from('owners').delete().eq('id', createdOwnerId);
      }
      return jsonNoStore({ error: companyError.message }, { status: 500 });
    }

    const { data: ownerRecord } = await supabaseAdmin
      .from('owners')
      .select('id, full_name, cpf, rg, birth_date')
      .eq('id', ownerId)
      .limit(1)
      .maybeSingle();

    const { data: addressRecord } = createdAddressId
      ? await supabaseAdmin
          .from('addresses')
          .select(
            'id, zip_code, street, number, complement, district, city, state, main_email, main_mobile, main_phone, created_at, updated_at'
          )
          .eq('id', createdAddressId)
          .limit(1)
          .maybeSingle()
      : { data: null };

    return jsonNoStore({ data: mapCompanyRecord(createdCompany, ownerRecord, addressRecord) }, { status: 201 });
  } catch (error) {
    if (createdAddressId) {
      await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
    }
    if (createdOwnerId) {
      await supabaseAdmin.from('owners').delete().eq('id', createdOwnerId);
    }

    console.error('Companies POST error:', error);
    return jsonNoStore(
      { error: `Erro ao cadastrar empresa: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasSupabaseAdminConfig) {
    return getMissingConfigResponse();
  }

  let createdOwnerId: string | null = null;
  let createdAddressId: string | null = null;

  try {
    const body = (await request.json()) as UpdateCompanyPayload;
    const id = norm(body?.id);

    if (!id) {
      return jsonNoStore({ error: 'ID da empresa obrigatorio para alteracao.' }, { status: 400 });
    }

    const { data: existingCompany, error: existingCompanyError } = await supabaseAdmin
      .from('companies')
      .select(
        'id, owner_id, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (existingCompanyError) {
      return jsonNoStore({ error: existingCompanyError.message }, { status: 500 });
    }

    if (!existingCompany?.id) {
      return jsonNoStore({ error: 'Empresa nao encontrada para alteracao.' }, { status: 404 });
    }

    const currentOwner = await loadOwnerById(norm(existingCompany?.owner_id));
    const legalName = norm(body?.legalName ?? existingCompany?.legal_name);
    const tradeName = norm(body?.tradeName ?? existingCompany?.trade_name);
    const cnpj = norm(body?.cnpj ?? existingCompany?.cnpj);
    const stateRegistration = norm(body?.stateRegistration ?? existingCompany?.state_registration);
    const municipalRegistration = norm(body?.municipalRegistration ?? existingCompany?.municipal_registration);
    const businessActivity = norm(body?.businessActivity ?? existingCompany?.business_activity);
    const cnae = norm(body?.cnae ?? existingCompany?.cnae);

    const ownerFullName = norm(body?.owner?.fullName ?? currentOwner?.full_name);
    const ownerCpf = norm(body?.owner?.cpf ?? currentOwner?.cpf);
    const ownerRg = norm(body?.owner?.rg ?? currentOwner?.rg);
    const ownerBirthDate = norm(body?.owner?.birthDate ?? currentOwner?.birth_date);

    if (!legalName) {
      return jsonNoStore({ error: 'Informe a razao social da empresa.' }, { status: 400 });
    }

    if (!cnpj) {
      return jsonNoStore({ error: 'Informe o CNPJ da empresa.' }, { status: 400 });
    }

    if (!ownerFullName || !ownerCpf) {
      return jsonNoStore({ error: 'Informe nome e CPF do proprietario/responsavel.' }, { status: 400 });
    }

    const { data: duplicateCompany, error: duplicateCompanyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .neq('id', id)
      .limit(1)
      .maybeSingle();

    if (duplicateCompanyError) {
      return jsonNoStore({ error: duplicateCompanyError.message }, { status: 500 });
    }

    if (duplicateCompany?.id) {
      return jsonNoStore({ error: 'Ja existe empresa cadastrada com este CNPJ.' }, { status: 409 });
    }

    const previousOwnerId = norm(existingCompany?.owner_id) || null;
    let nextOwnerId = previousOwnerId;

    const { data: ownerByCpf, error: ownerByCpfError } = await supabaseAdmin
      .from('owners')
      .select('id, cpf')
      .eq('cpf', ownerCpf)
      .limit(1)
      .maybeSingle();

    if (ownerByCpfError) {
      return jsonNoStore({ error: ownerByCpfError.message }, { status: 500 });
    }

    if (ownerByCpf?.id) {
      nextOwnerId = norm(ownerByCpf.id);

      const { error: updateOwnerError } = await supabaseAdmin
        .from('owners')
        .update({
          full_name: ownerFullName,
          cpf: ownerCpf,
          rg: ownerRg || null,
          birth_date: ownerBirthDate || null
        })
        .eq('id', nextOwnerId);

      if (updateOwnerError) {
        return jsonNoStore({ error: updateOwnerError.message }, { status: 500 });
      }
    } else if (previousOwnerId && ownerCpf === norm(currentOwner?.cpf)) {
      nextOwnerId = previousOwnerId;

      const { error: updateCurrentOwnerError } = await supabaseAdmin
        .from('owners')
        .update({
          full_name: ownerFullName,
          cpf: ownerCpf,
          rg: ownerRg || null,
          birth_date: ownerBirthDate || null
        })
        .eq('id', previousOwnerId);

      if (updateCurrentOwnerError) {
        return jsonNoStore({ error: updateCurrentOwnerError.message }, { status: 500 });
      }
    } else {
      const { data: createdOwner, error: createOwnerError } = await supabaseAdmin
        .from('owners')
        .insert([
          {
            full_name: ownerFullName,
            cpf: ownerCpf,
            rg: ownerRg || null,
            birth_date: ownerBirthDate || null
          }
        ])
        .select('id')
        .single();

      if (createOwnerError) {
        return jsonNoStore({ error: createOwnerError.message }, { status: 500 });
      }

      createdOwnerId = norm(createdOwner?.id) || null;
      nextOwnerId = createdOwnerId;
    }

    if (!nextOwnerId) {
      return jsonNoStore({ error: 'Nao foi possivel resolver owner_id para alteracao.' }, { status: 500 });
    }

    const previousAddressId = norm(existingCompany?.address_id) || null;
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
          if (createdOwnerId) {
            await safeDeleteOwnerIfOrphan(createdOwnerId);
          }
          return jsonNoStore({ error: createAddressError.message }, { status: 500 });
        }

        createdAddressId = norm(createdAddress?.id) || null;
        nextAddressId = createdAddressId;
      }
    } else if (payloadAddress && !hasAddressPayload(payloadAddress)) {
      nextAddressId = null;
    }

    const { data: updatedCompany, error: updateCompanyError } = await supabaseAdmin
      .from('companies')
      .update({
        owner_id: nextOwnerId,
        legal_name: legalName,
        trade_name: tradeName || null,
        cnpj,
        state_registration: stateRegistration || null,
        municipal_registration: municipalRegistration || null,
        business_activity: businessActivity || null,
        cnae: cnae || null,
        address_id: nextAddressId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(
        'id, owner_id, legal_name, trade_name, cnpj, state_registration, municipal_registration, business_activity, cnae, address_id, created_at, updated_at'
      )
      .maybeSingle();

    if (updateCompanyError) {
      if (createdAddressId) {
        await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
      }
      if (createdOwnerId) {
        await safeDeleteOwnerIfOrphan(createdOwnerId);
      }
      return jsonNoStore({ error: updateCompanyError.message }, { status: 500 });
    }

    if (!updatedCompany?.id) {
      if (createdAddressId) {
        await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
      }
      if (createdOwnerId) {
        await safeDeleteOwnerIfOrphan(createdOwnerId);
      }
      return jsonNoStore({ error: 'Empresa nao encontrada para alteracao.' }, { status: 404 });
    }

    if (previousAddressId && previousAddressId !== nextAddressId) {
      await deleteAddressIfOrphan(previousAddressId);
    }

    if (previousOwnerId && previousOwnerId !== nextOwnerId) {
      await safeDeleteOwnerIfOrphan(previousOwnerId);
    }

    const ownerRecord = await loadOwnerById(nextOwnerId);
    const addressRecord = nextAddressId ? await loadAddressById(nextAddressId) : null;
    return jsonNoStore({ data: mapCompanyRecord(updatedCompany, ownerRecord, addressRecord) });
  } catch (error) {
    if (createdAddressId) {
      await supabaseAdmin.from('addresses').delete().eq('id', createdAddressId);
    }
    if (createdOwnerId) {
      await safeDeleteOwnerIfOrphan(createdOwnerId);
    }

    console.error('Companies PATCH error:', error);
    return jsonNoStore(
      { error: `Erro ao alterar empresa: ${getSafeErrorMessage(error)}` },
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
      return jsonNoStore({ error: 'ID da empresa obrigatorio para exclusao.' }, { status: 400 });
    }

    const { data: existingCompany, error: existingCompanyError } = await supabaseAdmin
      .from('companies')
      .select('id, owner_id, address_id')
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (existingCompanyError) {
      return jsonNoStore({ error: existingCompanyError.message }, { status: 500 });
    }

    if (!existingCompany?.id) {
      return jsonNoStore({ error: 'Empresa nao encontrada para exclusao.' }, { status: 404 });
    }

    const ownerId = norm(existingCompany?.owner_id);
    const addressId = norm(existingCompany?.address_id);

    const { error: deleteCompanyError } = await supabaseAdmin.from('companies').delete().eq('id', id);
    if (deleteCompanyError) {
      return jsonNoStore({ error: deleteCompanyError.message }, { status: 500 });
    }

    if (addressId) {
      await deleteAddressIfOrphan(addressId);
    }

    if (ownerId) {
      await safeDeleteOwnerIfOrphan(ownerId);
    }

    return jsonNoStore({ ok: true, id });
  } catch (error) {
    console.error('Companies DELETE error:', error);
    return jsonNoStore(
      { error: `Erro ao excluir empresa: ${getSafeErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
