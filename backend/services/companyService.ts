
import { supabase } from '@/lib/supabase';

export interface Company {
    id?: string;
    owner_id: string;
    legal_name: string;
    trade_name?: string;
    cnpj: string;
    state_registration?: string;
    municipal_registration?: string;
    business_activity?: string;
    cnae?: string;
    address_id?: string;
}

export class CompanyService {
    static async create(data: Company): Promise<Company> {
        const { data: company, error } = await supabase
            .from('companies')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return company;
    }

    static async getById(id: string): Promise<Company | null> {
        const { data: company, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return company;
    }

    static async update(id: string, data: Partial<Company>): Promise<Company> {
        const { data: company, error } = await supabase
            .from('companies')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return company;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    static async list(): Promise<Company[]> {
        const { data: companies, error } = await supabase
            .from('companies')
            .select('*');

        if (error) throw new Error(error.message);
        return companies || [];
    }
}
