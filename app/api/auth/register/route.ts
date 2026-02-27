import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseRestUrl, supabaseServiceHeaders, hasSupabaseRestConfig } from '@/lib/supabaseRestClient';

const MISSING_CONFIG_RESPONSE = NextResponse.json(
  { error: 'Configuração do servidor incompleta. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' },
  { status: 500 }
);

export async function POST(req: NextRequest) {
  if (!hasSupabaseRestConfig) return MISSING_CONFIG_RESPONSE;

  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const branchCode = body?.branchCode ? String(body.branchCode).trim() : null;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const supabaseUrl = getSupabaseRestUrl();
    const headers = supabaseServiceHeaders();

    // 1. Gerar hash de senha e identificadores únicos
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const username = `${email.split('@')[0]}-${userId.substring(0, 4)}`;

    // 2. Resolver branchId a partir do branchCode (se fornecido)
    let branchId: string | null = null;
    if (branchCode) {
      const encoded = encodeURIComponent(branchCode);
      const branchRes = await fetch(
        `${supabaseUrl}/rest/v1/branches?or=(branch_code.eq.${encoded},branch_name.eq.${encoded})&select=id`,
        { headers }
      );
      const branches: { id: string }[] = await branchRes.json().catch(() => []);
      branchId = branches[0]?.id ?? null;
    }

    // 3. Inserir usuário
    const userRes = await fetch(`${supabaseUrl}/rest/v1/users`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ id: userId, email, username, password_hash: passwordHash, matriz_filial: branchCode, ativo: true }),
    });

    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      console.error('[register] Erro ao criar usuário:', err);
      return NextResponse.json(
        { error: err.message || err.error || 'Erro ao criar usuário.' },
        { status: 400 }
      );
    }

    // 4. Inserir perfil (o trigger handle_new_user já faz isso, mas garantimos aqui para consistência)
    await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: userId,
        full_name: name,
        email,
        role: 'user',
        permissions: [],
        branch_id: branchId,
        is_active: true,
      }),
    });

    return NextResponse.json({
      ok: true,
      user: { id: userId, name, email, username, branchId: branchCode },
    });
  } catch (error) {
    console.error('[register] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno ao cadastrar.' }, { status: 500 });
  }
}
