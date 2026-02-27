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

/** Shared JSON headers for API requests. */
const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

/** Posts JSON to a given path and returns parsed body + ok flag. */
async function postJson<T>(path: string, body: unknown): Promise<{ ok: boolean; data: T }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const data: T = await response.json().catch(() => ({}) as T);
  return { ok: response.ok, data };
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  try {
    const { ok, data } = await postJson<{ user?: User; token?: string; error?: string }>(
      '/api/auth/login',
      payload
    );
    if (!ok) return { ok: false, error: (data as { error?: string }).error || 'Falha ao autenticar.' };
    return { ok: true, user: data.user, token: data.token };
  } catch (error) {
    console.error('AuthService.login error:', error);
    return { ok: false, error: 'Erro ao conectar com o servidor.' };
  }
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
  try {
    const { ok, data } = await postJson<{ user?: User; error?: string }>(
      '/api/auth/register',
      payload
    );
    if (!ok) return { ok: false, error: (data as { error?: string }).error || 'Falha ao criar conta.' };
    return { ok: true, user: data.user };
  } catch (error) {
    console.error('AuthService.registerUser error:', error);
    return { ok: false, error: 'Erro ao conectar com o servidor.' };
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function logout(): Promise<void> { }
