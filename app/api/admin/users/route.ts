import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function resolveBranchId(filial?: string) {
  if (!filial) return null;

  const { data } = await supabaseAdmin
    .from('branches')
    .select('id, branch_code, branch_name')
    .or(`branch_code.eq.${filial},branch_name.eq.${filial}`)
    .limit(1)
    .single();

  return data?.id || null;
}

function mapUsuario(profile: any) {
  const branchName = profile.branch_name || profile.branches?.branch_name;
  const matriz = profile.matriz_filial || profile.users?.matriz_filial;
  const email = profile.email || profile.users?.email || '';
  const ativo = profile.ativo ?? profile.users?.ativo ?? profile.is_active;
  return {
    id: profile.id,
    nome: profile.full_name || '',
    email,
    filial: branchName || matriz || 'N/A',
    cargo: profile.role || 'user',
    permissoes: profile.permissions || [],
    ativo: Boolean(ativo),
    ultimoAcesso: profile.last_login
      ? new Date(profile.last_login).toLocaleString('pt-BR')
      : 'Nunca',
    dataCriacao: profile.created_at
      ? new Date(profile.created_at).toLocaleDateString('pt-BR')
      : ''
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('profiles')
      .select(
        'id, full_name, email, role, permissions, is_active, last_login, created_at, users(ativo, matriz_filial, email, username), branches(branch_name)'
      );

    if (status === 'ATIVOS') {
      query = query.eq('users.ativo', true);
    }
    if (status === 'INATIVOS') {
      query = query.eq('users.ativo', false);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const usuarios = (data || []).map(mapUsuario);
    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Erro ao listar usuarios.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const nome = String(body?.nome || '').trim();
    const filial = String(body?.filial || '').trim();
    const cargo = String(body?.cargo || 'user').trim();
    const permissoes = Array.isArray(body?.permissoes) ? body.permissoes : [];

    if (!email || !password || !filial) {
      return NextResponse.json({ error: 'Email, senha e filial sao obrigatorios.' }, { status: 400 });
    }

    const branchId = await resolveBranchId(filial);

    const { data, error } = await supabaseAdmin
      .rpc('create_app_user', {
        p_email: email,
        p_password: password,
        p_matriz_filial: filial,
        p_full_name: nome || null,
        p_role: cargo || null,
        p_permissions: permissoes,
        p_branch_id: branchId
      })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Falha ao criar usuario.' }, { status: 400 });
    }

    return NextResponse.json(mapUsuario(data));
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar usuario.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio.' }, { status: 400 });
    }

    const updateProfile: any = {};
    if (body?.nome) updateProfile.full_name = body.nome;
    if (body?.cargo) updateProfile.role = body.cargo;
    if (Array.isArray(body?.permissoes)) updateProfile.permissions = body.permissoes;

    let resolvedBranchId = body?.branchId || null;
    if (!resolvedBranchId && body?.filial) {
      resolvedBranchId = await resolveBranchId(String(body.filial));
    }
    if (resolvedBranchId) updateProfile.branch_id = resolvedBranchId;

    if (Object.keys(updateProfile).length > 0) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateProfile)
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (typeof body?.ativo === 'boolean') {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ ativo: body.ativo })
        .eq('id', id);

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 400 });
      }

      await supabaseAdmin.from('profiles').update({ is_active: body.ativo }).eq('id', id);
    }

    if (body?.filial) {
      await supabaseAdmin
        .from('users')
        .update({ matriz_filial: String(body.filial) })
        .eq('id', id);
    }

    if (body?.password) {
      const { error: pwdError } = await supabaseAdmin.rpc('update_app_user_password', {
        p_user_id: id,
        p_password: body.password
      });

      if (pwdError) {
        return NextResponse.json({ error: pwdError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin users PUT error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuario.' }, { status: 500 });
  }
}
