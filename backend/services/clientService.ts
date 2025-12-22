
import { supabase } from '@/lib/supabase';

export interface Client {
    id?: string;
    owner_id: string;
    person_type: 'INDIVIDUAL' | 'COMPANY';

    // Individual
    full_name?: string;
    cpf?: string;
    rg?: string;
    birth_date?: Date | string;

    // Company
    legal_name?: string;
    trade_name?: string;
    cnpj?: string;
    state_registration?: string;
    municipal_registration?: string;
    business_activity?: string;
    cnae?: string;

    address_id?: string;
}

export class ClientService {
    static async create(data: Client): Promise<Client> {
        const { data: client, error } = await supabase
            .from('clients')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return client;
    }

    static async getById(id: string): Promise<Client | null> {
        const { data: client, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return client;
    }

    static async update(id: string, data: Partial<Client>): Promise<Client> {
        const { data: client, error } = await supabase
            .from('clients')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return client;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    static async list(filters?: { owner_id?: string }): Promise<Client[]> {
        let query = supabase.from('clients').select('*');
        if (filters?.owner_id) {
            query = query.eq('owner_id', filters.owner_id);
        }

        const { data: clients, error } = await query;

        if (error) throw new Error(error.message);
        return clients || [];
    }
}
