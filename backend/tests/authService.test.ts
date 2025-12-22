
import { AuthService } from '../services/authService';
import { LoginCredentials } from '../models/Auth';

jest.mock('../data/mockUsers', () => ({
    mockUsers: [
        { id: '1', email: 'test@example.com', branchId: '1', active: true, password: 'pass' },
        { id: '2', email: 'inactive@example.com', branchId: '1', active: false, password: 'pass' }
    ],
    mockPasswords: {
        'test@example.com': 'pass',
        'inactive@example.com': 'pass'
    }
}));

describe('AuthService', () => {
    it('should login successfully', async () => {
        const creds: LoginCredentials = { email: 'test@example.com', password: 'pass', branchId: '1' };
        const res = await AuthService.login(creds);
        expect(res.user.email).toBe('test@example.com');
        expect(res.token).toBeDefined();
    });

    it('should fail with wrong password', async () => {
        const creds: LoginCredentials = { email: 'test@example.com', password: 'wrong', branchId: '1' };
        await expect(AuthService.login(creds)).rejects.toThrow('Credenciais inválidas');
    });

    it('should fail with wrong branch', async () => {
        const creds: LoginCredentials = { email: 'test@example.com', password: 'pass', branchId: '2' };
        await expect(AuthService.login(creds)).rejects.toThrow('Credenciais inválidas');
    });

    it('should fail if user is inactive', async () => {
        const creds: LoginCredentials = { email: 'inactive@example.com', password: 'pass', branchId: '1' };
        await expect(AuthService.login(creds)).rejects.toThrow('Usuário inativo');
    });

    it('should get current user', async () => {
        const token = 'mock_token_1_123';
        const user = await AuthService.getCurrentUser(token);
        expect(user.id).toBe('1');
    });

    it('should fail get user with invalid token', async () => {
        await expect(AuthService.getCurrentUser('invalid')).rejects.toThrow();
    });

    it('should change password', async () => {
        await AuthService.changePassword('1', { currentPassword: 'pass', newPassword: 'newpass', confirmPassword: 'newpass' });
    });

    it('should fail change password if wrong current', async () => {
        await expect(AuthService.changePassword('1', { currentPassword: 'wrong', newPassword: 'newpass', confirmPassword: 'newpass' })).rejects.toThrow();
    });

    it('should fail change password if mismatch', async () => {
        await expect(AuthService.changePassword('1', { currentPassword: 'pass', newPassword: 'newpass', confirmPassword: 'other' })).rejects.toThrow();
    });

    it('should fail change password if short', async () => {
        await expect(AuthService.changePassword('1', { currentPassword: 'pass', newPassword: '123', confirmPassword: '123' })).rejects.toThrow();
    });

    it('should fail change password if user not found', async () => {
        await expect(AuthService.changePassword('999', { currentPassword: 'pass', newPassword: 'newpass', confirmPassword: 'newpass' })).rejects.toThrow();
    });

    it('should request password reset', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        await AuthService.requestPasswordReset('test@example.com', '1');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should request password reset (user not found)', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        await AuthService.requestPasswordReset('unknown@example.com', '1');
        // valid, just returns
        consoleSpy.mockRestore();
    });

    it('should reset password', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        await AuthService.resetPassword('token', 'newpass123');
        expect(consoleSpy).toHaveBeenCalledWith('Password reset successful');
        consoleSpy.mockRestore();
    });

    it('should fail reset password if short', async () => {
        await expect(AuthService.resetPassword('token', '123')).rejects.toThrow();
    });
});
