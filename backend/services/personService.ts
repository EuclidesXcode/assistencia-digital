
import { supabase } from '@/lib/supabase';

export interface Person {
    id?: string;
    company_id: string;
    role_type: string;
    full_name: string;
    cpf?: string;
    rg?: string;
    ownership_percentage?: number;
    address_id?: string;
}

export class PersonService {
    static async create(data: Person): Promise<Person> {
        const { data: person, error } = await supabase
            .from('people')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return person;
    }

    static async getById(id: string): Promise<Person | null> {
        const { data: person, error } = await supabase
            .from('people')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return person;
    }

    static async update(id: string, data: Partial<Person>): Promise<Person> {
        const { data: person, error } = await supabase
            .from('people')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return person;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('people')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    static async list(filters?: { company_id?: string }): Promise<Person[]> {
        let query = supabase.from('people').select('*');
        if (filters?.company_id) {
            query = query.eq('company_id', filters.company_id);
        }

        const { data: people, error } = await query;

        if (error) throw new Error(error.message);
        return people || [];
    }
}
