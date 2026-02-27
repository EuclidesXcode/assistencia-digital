import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { getSupabaseRestUrl, supabaseServiceHeaders, hasSupabaseRestConfig } from '@/lib/supabaseRestClient';

const MISSING_CONFIG_RESPONSE = NextResponse.json(
  { error: 'Configuração do servidor incompleta. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' },
  { status: 500 }
);

export async function POST(req: NextRequest) {
  if (!hasSupabaseRestConfig) return MISSING_CONFIG_RESPONSE;

  try {
    const body = await req.json();
    const identifier = String(body?.email || '').trim();
    const password = String(body?.password || '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Login e senha são obrigatórios.' }, { status: 400 });
    }

    const supabaseUrl = getSupabaseRestUrl();
    const headers = supabaseServiceHeaders();

    // 1. Buscar usuário por email ou username
    const encodedId = encodeURIComponent(identifier);
    const usersRes = await fetch(
      `${supabaseUrl}/rest/v1/users?or=(email.eq.${encodedId},username.eq.${encodedId})&select=*`,
      { headers }
    );

    if (!usersRes.ok) {
      const err = await usersRes.text();
      console.error('[login] Erro ao buscar usuário:', usersRes.status, err);
      return NextResponse.json({ error: 'Erro ao conectar no banco de dados.' }, { status: 500 });
    }

    const users: Record<string, unknown>[] = await usersRes.json();

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const user = users[0];

    // 2. Validar senha
    const isPasswordCorrect = await bcrypt.compare(password, String(user.password_hash));
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    if (!user.ativo) {
      return NextResponse.json({ error: 'Usuário inativo.' }, { status: 403 });
    }

    // 3. Buscar perfil separadamente
    let profile: Record<string, unknown> = {};
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(String(user.id))}&select=*`,
        { headers }
      );
      if (profileRes.ok) {
        const profiles: Record<string, unknown>[] = await profileRes.json();
        if (profiles.length > 0) profile = profiles[0];
      }
    } catch (err) {
      console.warn('[login] Erro ao buscar perfil (ignorado):', err);
    }

    // 4. Gerar token e montar resposta
    const token = signToken({
      userId: String(user.id),
      email: String(user.email),
      role: String(profile?.role ?? 'user'),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: profile?.full_name || '',
        email: user.email,
        username: user.username || '',
        branchId: user.matriz_filial || '',
        role: profile?.role ?? undefined,
        permissions: profile?.permissions ?? [],
        token,
      },
    });
  } catch (error) {
    console.error('[login] Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno ao autenticar.' },
      { status: 500 }
    );
  }
}
