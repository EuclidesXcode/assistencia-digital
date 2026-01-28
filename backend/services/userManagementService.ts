
import { Usuario, AtividadeUsuario, CreateUsuarioDTO, UpdatePermissoesDTO, UpdateStatusDTO } from '../models/UserManagement';

export class UserManagementService {
    /**
     * Get all users
     */
    static async getUsuarios(filters?: {
        search?: string;
        filial?: string;
        status?: 'ATIVOS' | 'INATIVOS' | 'TODOS';
    }): Promise<Usuario[]> {
        const params = new URLSearchParams();
        if (filters?.search) params.set('search', filters.search);
        if (filters?.status) params.set('status', filters.status);

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Falha ao listar usuarios.');
        }

        const data = await response.json();
        return data.usuarios || [];
    }

    /**
     * Create new user
     * Note: This usually requires an Admin Function (Edge Function or API Route) to create Auth User.
     * Use Supabase Invite API or similar in real app.
     * For now, we stub this or assume the user handles it via Auth UI.
     */
    static async createUsuario(data: CreateUsuarioDTO): Promise<Usuario> {
        try {
            console.log('UserManagementService.createUsuario: Starting creation...', { email: data.email });

            // Prepare payload with default password if not provided
            const payload = {
                ...data,
                password: data.password || 'Mudar123!'
            };

            // Validation (basic)
            if (!payload.email) throw new Error('Email é obrigatório');
            if (!payload.password) throw new Error('Senha é obrigatória');

            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('UserManagementService.createUsuario: Response status', response.status);

            const text = await response.text();
            console.log('UserManagementService.createUsuario: Raw response', text.substring(0, 200)); // Log first 200 chars

            if (!response.ok) {
                let errorMessage = 'Falha ao criar usuário via API';
                try {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                } catch (e) {
                    console.warn('Could not parse error JSON', e);
                    errorMessage += `: ${text}`;
                }
                throw new Error(errorMessage);
            }

            return JSON.parse(text);
        } catch (error: any) {
            console.error('UserManagementService.createUsuario: Error', error);
            throw error;
        }
    }

    /**
     * Update user details (Full Update)
     */
    static async updateUsuario(usuarioId: string, data: Partial<Usuario> & { password?: string }): Promise<void> {
        const response = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: usuarioId,
                nome: data.nome,
                filial: (data as any).filial,
                cargo: data.cargo,
                permissoes: data.permissoes,
                branchId: (data as any).branchId,
                password: data.password
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error('Falha ao atualizar usuario: ' + text);
        }
    }

    /**
     * Update user permissions
     */
    static async updatePermissoes(usuarioId: string, data: UpdatePermissoesDTO): Promise<void> {
        const response = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: usuarioId, permissoes: data.permissoes })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Erro ao atualizar permissoes.');
        }
    }

    /**
     * Update user status
     */
    static async updateStatus(usuarioId: string, data: UpdateStatusDTO): Promise<void> {
        const response = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: usuarioId, ativo: data.ativo })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Erro ao atualizar status.');
        }
    }

    /**
     * Get user activities (Audit Logs)
     */
    static async getAtividades(usuarioId: string): Promise<AtividadeUsuario[]> {
        const response = await fetch(`/api/admin/users/activities?userId=${usuarioId}`);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Erro ao buscar atividades.');
        }

        const data = await response.json();
        return data.atividades || [];
    }

    /**
     * Get user statistics
     */
    static async getStats() {
        const response = await fetch('/api/admin/users/stats');
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Erro ao buscar estatisticas.');
        }

        return response.json();
    }
}
