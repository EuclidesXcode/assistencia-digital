import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        {
          error:
            'Configuracao do servidor incompleta. Defina SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.'
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const login = String(body?.email || '').trim();
    const password = String(body?.password || '');

    console.log('--- MANUAL LOGIN DEBUG ---');
    console.log('Tentativa de login para:', login);

    if (!login || !password) {
      return NextResponse.json({ error: 'Login e senha sao obrigatorios.' }, { status: 400 });
    }

    // 1. Busca apenas o usuário (sem join com profiles para evitar erro de FK)
    const loginParam = encodeURIComponent(login);
    const usersUrl = `${SUPABASE_URL}/rest/v1/users?or=(email.eq.${loginParam},username.eq.${loginParam})&select=*`;
    console.log('Consultando Users URL:', usersUrl);

    const response = await fetch(usersUrl, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na busca de usuário:', response.status, errorText);
      return NextResponse.json({ error: 'Erro ao conectar no banco de dados.' }, { status: 500 });
    }

    const users = await response.json();

    if (!Array.isArray(users) || users.length === 0) {
      console.log('Nenhum usuário encontrado para:', login);
      return NextResponse.json({ error: 'Credenciais invalidas.' }, { status: 401 });
    }

    const user = users[0];
    console.log('Usuário encontrado:', { id: user.id, email: user.email });

    // 2. Validação manual da senha
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordCorrect) {
      console.log('Senha incorreta.');
      return NextResponse.json({ error: 'Credenciais invalidas.' }, { status: 401 });
    }

    if (!user.ativo) {
      return NextResponse.json({ error: 'Usuario inativo.' }, { status: 403 });
    }

    // 3. Busca o perfil separadamente
    let profileData: any = {};
    try {
      const profileId = encodeURIComponent(String(user.id));
      const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=*`;
      const profileResponse = await fetch(profilesUrl, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (profileResponse.ok) {
        const profiles = await profileResponse.json();
        if (Array.isArray(profiles) && profiles.length > 0) {
          profileData = profiles[0];
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar perfil (ignorado):', err);
    }

    // Gera o token JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: profileData?.role || 'user'
    });

    const userData = {
      id: user.id,
      name: profileData?.full_name || '',
      email: user.email,
      username: user.username || '',
      branchId: user.matriz_filial || '',
      role: profileData?.role || undefined,
      permissions: profileData?.permissions || [],
      token: token
    };

    console.log('Login bem sucedido! Token gerado.');

    return NextResponse.json({ user: userData });
  } catch (error: any) {
    console.error('Manual Login API error FULL:', error);
    return NextResponse.json({ error: 'Erro interno ao autenticar: ' + (error?.message || String(error)) }, { status: 500 });
  }
}
