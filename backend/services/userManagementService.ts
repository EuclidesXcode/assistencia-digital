// User Management Service

import { Usuario, AtividadeUsuario, CreateUsuarioDTO, UpdatePermissoesDTO, UpdateStatusDTO } from '../models/UserManagement';
import { mockUsuarios, mockAtividades } from '../data/mockUserManagement';

export class UserManagementService {
    /**
     * Get all users (admin only)
     */
    static async getUsuarios(filters?: {
        search?: string;
        filial?: string;
        status?: 'ATIVOS' | 'INATIVOS' | 'TODOS';
    }): Promise<Usuario[]> {
        let usuarios = [...mockUsuarios];

        // Apply filters
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            usuarios = usuarios.filter(u =>
                u.nome.toLowerCase().includes(searchLower) ||
                u.email.toLowerCase().includes(searchLower)
            );
        }

        if (filters?.filial && filters.filial !== 'TODAS') {
            usuarios = usuarios.filter(u => u.filial === filters.filial);
        }

        if (filters?.status) {
            if (filters.status === 'ATIVOS') {
                usuarios = usuarios.filter(u => u.ativo);
            } else if (filters.status === 'INATIVOS') {
                usuarios = usuarios.filter(u => !u.ativo);
            }
        }

        return usuarios;
    }

    /**
     * Create new user (admin only)
     */
    static async createUsuario(data: CreateUsuarioDTO): Promise<Usuario> {
        const newUsuario: Usuario = {
            id: String(mockUsuarios.length + 1),
            nome: data.nome,
            email: data.email,
            filial: data.filial,
            cargo: data.cargo,
            permissoes: data.permissoes,
            ativo: true,
            ultimoAcesso: 'Nunca',
            dataCriacao: new Date().toLocaleDateString('pt-BR')
        };

        mockUsuarios.push(newUsuario);
        return newUsuario;
    }

    /**
     * Update user permissions (admin only)
     */
    static async updatePermissoes(usuarioId: string, data: UpdatePermissoesDTO): Promise<void> {
        const usuario = mockUsuarios.find(u => u.id === usuarioId);
        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        usuario.permissoes = data.permissoes;
    }

    /**
     * Update user status (admin only)
     */
    static async updateStatus(usuarioId: string, data: UpdateStatusDTO): Promise<void> {
        const usuario = mockUsuarios.find(u => u.id === usuarioId);
        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        usuario.ativo = data.ativo;
    }

    /**
     * Get user activities (admin only)
     */
    static async getAtividades(usuarioId: string): Promise<AtividadeUsuario[]> {
        return mockAtividades.filter(a => a.usuarioId === usuarioId);
    }

    /**
     * Get user statistics
     */
    static async getStats() {
        return {
            total: mockUsuarios.length,
            ativos: mockUsuarios.filter(u => u.ativo).length,
            inativos: mockUsuarios.filter(u => !u.ativo).length,
            atividadesHoje: mockAtividades.length
        };
    }
}
