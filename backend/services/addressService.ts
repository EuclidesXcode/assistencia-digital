
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Address {
    id?: string;
    zip_code?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    main_email?: string;
    main_mobile?: string;
    main_phone?: string;
}

export class AddressService {
    static async create(data: Address): Promise<Address> {
        const { data: address, error } = await supabase
            .from('addresses')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return address;
    }

    static async getById(id: string): Promise<Address | null> {
        const { data: address, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return address;
    }

    static async update(id: string, data: Address): Promise<Address> {
        const { data: address, error } = await supabase
            .from('addresses')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return address;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('addresses')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    static async list(): Promise<Address[]> {
        const { data: addresses, error } = await supabase
            .from('addresses')
            .select('*');

        if (error) throw new Error(error.message);
        return addresses || [];
    }
}
