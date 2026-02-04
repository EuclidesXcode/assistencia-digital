import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const branchCode = body?.branchCode ? String(body.branchCode).trim() : null;

    console.log('--- MANUAL REGISTER DEBUG ---');
    console.log('Tentativa de cadastro para:', email);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha sao obrigatorios.' }, { status: 400 });
    }

    // 1. Gera o hash da senha no servidor
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = uuidv4();
    // Gera username único combinando prefixo do email + sufixo aleatório
    const username = `${email.split('@')[0]}-${userId.substring(0, 4)}`;

    // 2. Verifica se a filial existe (se fornecida)
    let branchId = null;
    if (branchCode) {
      const bResp = await fetch(
        `${SUPABASE_URL}/rest/v1/branches?or=(branch_code.eq.${branchCode},branch_name.eq.${branchCode})&select=id`,
        {
          headers: {
            'apikey': SERVICE_KEY || '',
            'Authorization': `Bearer ${SERVICE_KEY}`
          }
        }
      );
      const branches = await bResp.json();
      branchId = branches[0]?.id || null;
    }

    // 3. Insere na tabela 'users' (via REST API direto)
    const userResp = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY || '',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: userId,
        email,
        username,
        password_hash: passwordHash,
        matriz_filial: branchCode,
        ativo: true
      })
    });

    if (!userResp.ok) {
      const err = await userResp.json();
      console.error('Erro ao criar user:', err);
      return NextResponse.json({
        error: err.message || err.error || JSON.stringify(err) || 'Erro desconhecido ao criar usuário.'
      }, { status: 400 });
    }

    // 4. Insere na tabela 'profiles'
    const profileResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY || '',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: userId,
        full_name: name,
        email: email,
        role: 'user',
        permissions: [],
        branch_id: branchId,
        is_active: true
      })
    });

    console.log('Cadastro realizado com sucesso via modelo manual.');

    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        name,
        email,
        username,
        branchId: branchCode
      }
    });
  } catch (error) {
    console.error('Manual Register API error:', error);
    return NextResponse.json({ error: 'Erro interno ao cadastrar.' }, { status: 500 });
  }
}
