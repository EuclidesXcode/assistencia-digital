
import { supabase } from '@/lib/supabase';
import { Usuario, AtividadeUsuario, CreateUsuarioDTO, UpdatePermissoesDTO, UpdateStatusDTO } from '../models/UserManagement';

// Helper to map Profile to Usuario
function mapProfileToUsuario(profile: any): Usuario {
    return {
        id: profile.id,
        nome: profile.full_name || '',
        email: profile.email || '',
        filial: profile.branches?.branch_name || 'N/A', // Assuming relation
        cargo: profile.role || 'user',
        permissoes: profile.permissions || [],
        ativo: profile.is_active,
        ultimoAcesso: profile.last_login ? new Date(profile.last_login).toLocaleString('pt-BR') : 'Nunca',
        dataCriacao: new Date(profile.created_at).toLocaleDateString('pt-BR')
    };
}

export class UserManagementService {
    /**
     * Get all users
     */
    static async getUsuarios(filters?: {
        search?: string;
        filial?: string;
        status?: 'ATIVOS' | 'INATIVOS' | 'TODOS';
    }): Promise<Usuario[]> {
        let query = supabase
            .from('profiles')
            .select(`
                *,
                branches (branch_name)
            `);

        if (filters?.filial && filters.filial !== 'TODAS') {
            // This assumes filtering by branch ID or Name. Since DTO uses string, we need to adapt.
            // Ideally we filter by branch_id. For now, assuming client handles mapping.
            // query = query.eq('branch_id', filters.filial); 
        }

        if (filters?.status) {
            if (filters.status === 'ATIVOS') {
                query = query.eq('is_active', true);
            } else if (filters.status === 'INATIVOS') {
                query = query.eq('is_active', false);
            }
        }

        const { data: profiles, error } = await query;

        if (error) throw new Error(error.message);

        let usuarios = profiles.map(mapProfileToUsuario);

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            usuarios = usuarios.filter(u =>
                u.nome.toLowerCase().includes(searchLower) ||
                u.email.toLowerCase().includes(searchLower)
            );
        }

        return usuarios;
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
        // 1. Update Profile Data
        const updateData: any = {};
        if (data.nome) updateData.full_name = data.nome;
        if (data.cargo) updateData.role = data.cargo;
        if (data.permissoes) updateData.permissions = data.permissoes;
        // email is tricky to update in supabase without auth re-verification, often better to leave it read-only or handle via specific auth flow

        if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', usuarioId);

            if (error) throw new Error('Erro ao atualizar perfil: ' + error.message);
        }

        // 2. Update Password (if provided) - This requires an Admin API call usually, similar to create
        if (data.password && data.password.trim() !== "") {
            const response = await fetch('/api/admin/users', {
                method: 'PUT', // Using PUT or PATCH for updates
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: usuarioId, password: data.password }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error('Falha ao atualizar senha: ' + text);
            }
        }
    }

    /**
     * Update user permissions
     */
    static async updatePermissoes(usuarioId: string, data: UpdatePermissoesDTO): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ permissions: data.permissoes })
            .eq('id', usuarioId);

        if (error) throw new Error(error.message);
    }

    /**
     * Update user status
     */
    static async updateStatus(usuarioId: string, data: UpdateStatusDTO): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: data.ativo })
            .eq('id', usuarioId);

        if (error) throw new Error(error.message);
    }

    /**
     * Get user activities (Audit Logs)
     */
    static async getAtividades(usuarioId: string): Promise<AtividadeUsuario[]> {
        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', usuarioId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        return logs.map((log: any) => ({
            id: log.id,
            usuarioId: log.user_id,
            acao: log.action,
            modulo: log.resource || 'Sistema',
            data: new Date(log.created_at).toLocaleString('pt-BR'),
            detalhes: log.details ? JSON.stringify(log.details) : (log.resource || '')
        }));
    }

    /**
     * Get user statistics
     */
    static async getStats() {
        const { data: profiles, error } = await supabase.from('profiles').select('is_active');
        if (error) throw new Error(error.message);

        const total = profiles.length;
        const ativos = profiles.filter(p => p.is_active).length;
        const inativos = total - ativos;

        // Count today's activities
        const today = new Date().toISOString().split('T')[0];
        const { count, error: countError } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today);

        if (countError) throw new Error(countError.message);

        return {
            total,
            ativos,
            inativos,
            atividadesHoje: count || 0
        };
    }
}
