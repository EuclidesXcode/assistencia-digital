// Authentication Service

import { LoginCredentials, LoginResponse, User, ChangePasswordDTO } from '../models/Auth';
import { mockUsers, mockPasswords } from '../data/mockUsers';

export class AuthService {
    /**
     * Authenticate user with credentials
     */
    static async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const { email, password, branchId } = credentials;

        // Find user by email and branchId
        const user = mockUsers.find(
            u => u.email.toLowerCase() === email.toLowerCase() &&
                u.branchId.toLowerCase() === branchId.toLowerCase()
        );

        if (!user) {
            throw new Error('Credenciais inválidas');
        }

        // Check password
        const storedPassword = mockPasswords[email];
        if (storedPassword !== password) {
            throw new Error('Credenciais inválidas');
        }

        // Check if user is active
        if (!user.active) {
            throw new Error('Usuário inativo');
        }

        // Generate mock JWT token (in production, use real JWT)
        const token = `mock_token_${user.id}_${Date.now()}`;

        // Update last login
        user.lastLogin = new Date();

        return {
            user,
            token,
            expiresIn: 3600 // 1 hour
        };
    }

    /**
     * Get current user from token
     */
    static async getCurrentUser(token: string): Promise<User> {
        // In production, decode and verify JWT token
        // For now, extract user ID from mock token
        const userId = token.split('_')[2];
        const user = mockUsers.find(u => u.id === userId);

        if (!user) {
            throw new Error('Token inválido');
        }

        return user;
    }

    /**
     * Change user password
     */
    static async changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
        const user = mockUsers.find(u => u.id === userId);

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Verify current password
        const currentPassword = mockPasswords[user.email];
        if (currentPassword !== data.currentPassword) {
            throw new Error('Senha atual incorreta');
        }

        // Verify new password confirmation
        if (data.newPassword !== data.confirmPassword) {
            throw new Error('As senhas não coincidem');
        }

        // Validate password strength
        if (data.newPassword.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres');
        }

        // Update password (in production, hash the password)
        mockPasswords[user.email] = data.newPassword;
    }

    /**
     * Request password reset
     */
    static async requestPasswordReset(email: string, branchId: string): Promise<void> {
        const user = mockUsers.find(
            u => u.email.toLowerCase() === email.toLowerCase() &&
                u.branchId.toLowerCase() === branchId.toLowerCase()
        );

        if (!user) {
            // Don't reveal if user exists or not
            return;
        }

        // In production, send email with reset token
        console.log(`Password reset email sent to ${email}`);
    }

    /**
     * Reset password with token
     */
    static async resetPassword(token: string, newPassword: string): Promise<void> {
        // In production, verify reset token
        // For now, just validate password
        if (newPassword.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres');
        }

        // Update password in production
        console.log('Password reset successful');
    }
}
