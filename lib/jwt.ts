import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gromit_control_secret_key_2024';

export function signToken(payload: any) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}
