import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type RegisterRow = {
  id: string;
  matriz_filial: string | null;
  email: string;
  full_name: string | null;
  role: string | null;
  permissions: string[] | null;
  branch_id: string | null;
  branch_name: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

function mapRegisterRow(row: RegisterRow) {
  return {
    id: row.id,
    name: row.full_name || '',
    email: row.email,
    branchId: row.branch_id || row.matriz_filial || '',
    branches: row.branch_name ? { branch_name: row.branch_name } : undefined,
    role: row.role || undefined,
    permissions: row.permissions || [],
    active: row.ativo,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const branchCode = String(body?.branchCode || '').trim();

    if (!email || !password || !branchCode) {
      return NextResponse.json(
        { error: 'Nome, email, senha e filial sao obrigatorios.' },
        { status: 400 }
      );
    }

    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('id')
      .or(`branch_code.eq.${branchCode},branch_name.eq.${branchCode}`)
      .limit(1)
      .single();

    const { data, error } = await supabaseAdmin
      .rpc('create_app_user', {
        p_email: email,
        p_password: password,
        p_matriz_filial: branchCode,
        p_full_name: name || null,
        p_branch_id: branch?.id || null
      })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Falha ao criar usuario.' }, { status: 400 });
    }

    return NextResponse.json({ user: mapRegisterRow(data as RegisterRow) });
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ error: 'Erro interno ao cadastrar.' }, { status: 500 });
  }
}
