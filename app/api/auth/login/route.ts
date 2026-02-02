import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type LoginRow = {
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
  last_login: string | null;
};

function mapLoginRow(row: LoginRow) {
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
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    lastLogin: row.last_login ? new Date(row.last_login) : undefined
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha sao obrigatorios.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .rpc('login_user', { p_email: email, p_password: password })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Credenciais invalidas.' }, { status: 401 });
    }

    return NextResponse.json({ user: mapLoginRow(data as LoginRow) });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Erro interno ao autenticar.' }, { status: 500 });
  }
}
