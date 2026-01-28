
import { UserManagementService } from '../services/userManagementService';

const fetchMock = jest.fn();
// @ts-ignore
global.fetch = fetchMock;

const mockUsuario = {
    id: 'user-123',
    nome: 'Test User',
    email: 'test@example.com',
    filial: 'Branch A',
    cargo: 'user',
    permissoes: ['read'],
    ativo: true,
    ultimoAcesso: '2023-01-01 12:00:00',
    dataCriacao: '2023-01-01'
};

describe('UserManagementService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    beforeEach(() => {
        fetchMock.mockReset();
    });

    it('should get all users', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ usuarios: [mockUsuario] })
        });
        const users = await UserManagementService.getUsuarios();
        expect(users).toHaveLength(1);
    });

    it('should filter users by status ATIVOS', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ usuarios: [mockUsuario] })
        });
        const result = await UserManagementService.getUsuarios({ status: 'ATIVOS' });
        expect(result.length).toBe(1);
    });

    it('should filter users by status INATIVOS', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ usuarios: [] })
        });
        const result = await UserManagementService.getUsuarios({ status: 'INATIVOS' });
        expect(result.length).toBe(0);
    });

    it('should filter users by search', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ usuarios: [mockUsuario] })
        });
        const result = await UserManagementService.getUsuarios({ search: 'Test' });
        expect(result).toHaveLength(1);
    });

    it('should filter users by search (no match)', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ usuarios: [] })
        });
        const result = await UserManagementService.getUsuarios({ search: 'NotFound' });
        expect(result).toHaveLength(0);
    });

    it('should create user via API', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: async () => JSON.stringify(mockUsuario)
        });
        const usuario = await UserManagementService.createUsuario({
            nome: 'Test User',
            email: 'test@example.com',
            filial: '0001',
            cargo: 'user',
            permissoes: []
        });
        expect(usuario.id).toBe(mockUsuario.id);
    });

    it('should update user status', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: async () => ''
        });
        await UserManagementService.updateStatus('user-123', { ativo: false });
    });

    it('should update user permissions', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: async () => ''
        });
        await UserManagementService.updatePermissoes('user-123', { permissoes: ['admin'] });
    });

    it('should get user activities', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ atividades: [{ id: 'log-1' }] })
        });
        const logs = await UserManagementService.getAtividades('user-123');
        expect(logs).toHaveLength(1);
    });

    it('should get stats', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ total: 1, ativos: 1, inativos: 0, atividadesHoje: 5 })
        });
        const stats = await UserManagementService.getStats();
        expect(stats.total).toBe(1);
    });
});
