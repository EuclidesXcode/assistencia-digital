import { hasPermission, canAccessModule } from './permissions';

describe('Permissions Lib', () => {
    it('should return true if user has permission', () => {
        expect(hasPermission({ role: 'admin', permissions: ['admin'] }, 'admin')).toBe(true);
    });

    it('should return false if user does not have permission', () => {
        expect(hasPermission({ role: 'user', permissions: ['user'] }, 'admin')).toBe(false);
    });
    it('should return false for empty permissions', () => {
        expect(hasPermission({ role: 'user', permissions: [] }, 'admin')).toBe(false);
    });

    describe('canAccessModule', () => {
        it('should allow access to public modules (unknown)', () => {
            expect(canAccessModule(null, 'dashboard')).toBe(true);
        });

        it('should allow admin to access everything', () => {
            const admin = { role: 'Administrador', permissions: [] };
            expect(canAccessModule(admin, 'cadastro')).toBe(true);
        });

        it('should check permissions for restricted modules', () => {
            const user = { role: 'User', permissions: ['cadastro', 'orcamentos'] };
            expect(canAccessModule(user, 'cadastro')).toBe(true);
            expect(canAccessModule(user, 'orcamentos')).toBe(true);
            expect(canAccessModule(user, 'nfe-xml')).toBe(false);
        });

        it('should deny if user is null', () => {
            expect(canAccessModule(null, 'cadastro')).toBe(false);
        });
    });
});
