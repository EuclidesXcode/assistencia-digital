import { supabase } from '@/lib/supabase';
import { RecebimentoRegistro } from '../models/Recebimento';

export class RecebimentoService {
    static async getRegistros(): Promise<RecebimentoRegistro[]> {
        const { data, error } = await supabase.from('recebimentos').select('*');
        if (error) {
            console.error('Error fetching receipts:', error);
            return [];
        }
        return data || [];
    }

    static async efetuarRecebimento(ids: string[]): Promise<void> {
        if (!ids.length) return;

        // Example update - adjust based on real table schema
        await supabase
            .from('recebimentos')
            .update({ status: 'recebido', data_recebimento: new Date() })
            .in('id', ids);
    }
}
