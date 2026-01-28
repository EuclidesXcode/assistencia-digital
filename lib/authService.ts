import { User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
  branchId?: string;
}

export interface RegisterPayload {
  name: string;
  branchCode: string;
  email: string;
  password: string;
}

export interface AuthResult {
  ok: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || 'Falha ao autenticar.'
      };
    }

    return {
      ok: true,
      user: data.user,
      token: data.token
    };
  } catch (error) {
    console.error('AuthService.login error:', error);
    return {
      ok: false,
      error: 'Erro ao conectar com o servidor.'
    };
  }
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || 'Falha ao criar conta.'
      };
    }

    return {
      ok: true,
      user: data.user
    };
  } catch (error) {
    console.error('AuthService.registerUser error:', error);
    return {
      ok: false,
      error: 'Erro ao conectar com o servidor.'
    };
  }
}

export async function logout(): Promise<void> {
  return;
}
