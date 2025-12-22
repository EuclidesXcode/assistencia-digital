
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
        // Placeholder: In a real implementation, call a Next.js API route that uses Service Role
        // to supabase.auth.admin.createUser()
        throw new Error('Create User must be done via Auth Signup or Admin API');
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
