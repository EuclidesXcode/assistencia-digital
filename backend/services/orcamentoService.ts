import { supabase } from '@/lib/supabase';
import { OrcamentoRegistro } from '../models/Orcamento';

export class OrcamentoService {
    static async getRegistros(): Promise<OrcamentoRegistro[]> {
        const { data, error } = await supabase.from('orcamentos').select('*');
        if (error) {
            console.error('Error fetching budgets:', error);
            return [];
        }
        return data || [];
    }

    static async getRegistrosByMarca(marca: string): Promise<OrcamentoRegistro[]> {
        const query = supabase.from('orcamentos').select('*');

        if (marca !== 'TODAS') {
            query.eq('marca', marca);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching budgets by brand:', error);
            return [];
        }
        return data || [];
    }
}
