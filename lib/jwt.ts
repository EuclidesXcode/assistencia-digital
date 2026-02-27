import jwt from 'jsonwebtoken';

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    [key: string]: unknown;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.warn('[jwt] JWT_SECRET não configurada. Usando segredo padrão — NÃO use isso em produção!');
}

const secret = JWT_SECRET || 'gromit_control_secret_key_2024';

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, secret, { expiresIn: '1d' });
}

export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, secret) as JwtPayload;
    } catch {
        return null;
    }
}
