
import { UserManagementService } from '../services/userManagementService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn()
    }
}));

const mockSupabase = supabase as unknown as {
    from: jest.Mock;
};

const mockChain = (data: any, error: any = null) => {
    const single = jest.fn().mockResolvedValue({ data, error });
    const promise = Promise.resolve({ data, error });

    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single,
        then: (onfulfilled: any) => promise.then(onfulfilled)
    };

    mockSupabase.from.mockReturnValue(chain);
    return chain;
};

const mockProfile = {
    id: 'user-123',
    full_name: 'Test Usere',
    email: 'test@example.com',
    branch_id: 'branch-1',
    branches: { branch_name: 'Branch A' },
    role: 'user',
    permissions: ['read'],
    is_active: true,
    last_login: '2023-01-01T12:00:00Z',
    created_at: '2023-01-01T10:00:00Z'
};

const mockProfileInactive = { ...mockProfile, id: 'user-inactive', is_active: false };

const mockAuditLog = {
    id: 'log-1',
    user_id: 'user-123',
    action: 'LOGIN',
    details: { ip: '127.0.0.1' },
    created_at: '2023-01-01T12:00:00Z'
};

describe('UserManagementService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should get all users', async () => {
        mockChain([mockProfile]);
        const users = await UserManagementService.getUsuarios();
        expect(users).toHaveLength(1);
    });

    it('should filter users by status ATIVOS', async () => {
        mockChain([mockProfile]);
        const result = await UserManagementService.getUsuarios({ status: 'ATIVOS' });
        expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should filter users by status INATIVOS', async () => {
        mockChain([mockProfileInactive]);
        const result = await UserManagementService.getUsuarios({ status: 'INATIVOS' });
        expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should filter users by search', async () => {
        mockChain([mockProfile]);
        const result = await UserManagementService.getUsuarios({ search: 'Test' });
        expect(result).toHaveLength(1);
    });

    it('should filter users by search (no match)', async () => {
        mockChain([mockProfile]);
        const result = await UserManagementService.getUsuarios({ search: 'NotFound' });
        expect(result).toHaveLength(0);
    });

    it('should throw on create user (placeholder)', async () => {
        await expect(UserManagementService.createUsuario({} as any)).rejects.toThrow();
    });

    it('should update user status', async () => {
        mockChain(null);
        await UserManagementService.updateStatus('user-123', { ativo: false });
    });

    it('should update user permissions', async () => {
        mockChain(null);
        await UserManagementService.updatePermissoes('user-123', { permissoes: ['admin'] });
    });

    it('should get user activities', async () => {
        mockChain([mockAuditLog]);
        const logs = await UserManagementService.getAtividades('user-123');
        expect(logs).toHaveLength(1);
    });

    it('should get stats', async () => {
        const profilesChain = {
            select: jest.fn().mockResolvedValue({ data: [mockProfile], error: null })
        };
        const auditChain = {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ count: 5, error: null })
        };

        const fromMock = jest.fn();
        fromMock.mockReturnValueOnce(profilesChain).mockReturnValueOnce(auditChain);

        // @ts-ignore
        mockSupabase.from = fromMock;

        const stats = await UserManagementService.getStats();
        expect(stats.total).toBe(1);
    });
});
