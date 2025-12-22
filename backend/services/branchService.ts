
import { supabase } from '@/lib/supabase';

export interface Branch {
    id?: string;
    company_id?: string;
    client_id?: string;
    branch_name: string;
    branch_code?: string;
    cnpj?: string;
    state_registration?: string;
    municipal_registration?: string;
    address_id?: string;
    is_headquarters?: boolean;
}

export class BranchService {
    static async create(data: Branch): Promise<Branch> {
        const { data: branch, error } = await supabase
            .from('branches')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return branch;
    }

    static async getById(id: string): Promise<Branch | null> {
        const { data: branch, error } = await supabase
            .from('branches')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return branch;
    }

    static async update(id: string, data: Partial<Branch>): Promise<Branch> {
        const { data: branch, error } = await supabase
            .from('branches')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return branch;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    static async list(filters?: { company_id?: string; client_id?: string }): Promise<Branch[]> {
        let query = supabase.from('branches').select('*');

        if (filters?.company_id) {
            query = query.eq('company_id', filters.company_id);
        }
        if (filters?.client_id) {
            query = query.eq('client_id', filters.client_id);
        }

        const { data: branches, error } = await query;

        if (error) throw new Error(error.message);
        return branches || [];
    }
}
