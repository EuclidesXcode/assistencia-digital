
import { supabase } from '@/lib/supabase';

export interface Entity {
    id?: string;
    owner_id?: string;
    entity_type: 'MANUFACTURER' | 'SUPPLIER';
    name: string;
    legal_name?: string;
    cnpj?: string;
    website?: string;
    notes?: string;
    address_id?: string;
}

export class EntityService {
    static async create(data: Entity): Promise<Entity> {
        const { data: entity, error } = await supabase
            .from('entities')
            .insert(data)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return entity;
    }

    static async getById(id: string): Promise<Entity | null> {
        const { data: entity, error } = await supabase
            .from('entities')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return entity;
    }

    static async update(id: string, data: Partial<Entity>): Promise<Entity> {
        const { data: entity, error } = await supabase
            .from('entities')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return entity;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('entities')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    static async list(filters?: { entity_type?: string }): Promise<Entity[]> {
        let query = supabase.from('entities').select('*');
        if (filters?.entity_type) {
            query = query.eq('entity_type', filters.entity_type);
        }

        const { data: entities, error } = await query;

        if (error) throw new Error(error.message);
        return entities || [];
    }
}
