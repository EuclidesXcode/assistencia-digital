
import { supabase } from '@/lib/supabase';

export interface Owner {
    id?: string;
    full_name: string;
    cpf: string;
    rg?: string;
    birth_date?: Date | string;
    address_id?: string;
}

export class OwnerService {
    static async create(data: Owner): Promise<Owner> {
        const { data: owner, error } = await supabase
            .from('owners')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return owner;
    }

    static async getById(id: string): Promise<Owner | null> {
        const { data: owner, error } = await supabase
            .from('owners')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return owner;
    }

    static async update(id: string, data: Partial<Owner>): Promise<Owner> {
        const { data: owner, error } = await supabase
            .from('owners')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return owner;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('owners')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    static async list(): Promise<Owner[]> {
        const { data: owners, error } = await supabase
            .from('owners')
            .select('*');

        if (error) throw new Error(error.message);
        return owners || [];
    }
}
