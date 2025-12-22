import { supabase } from '@/lib/supabase';
import { PreAnaliseProduto } from '../models/PreAnalise';

export class PreAnaliseService {
    static async getPendentes(): Promise<PreAnaliseProduto[]> {
        const { data, error } = await supabase
            .from('pre_analise')
            .select('*')
            .eq('status', 'pendente');

        if (error) {
            console.error('Error fetching pending analyses:', error);
            return [];
        }
        return data || [];
    }

    static async getResultados(): Promise<PreAnaliseProduto[]> {
        const { data, error } = await supabase
            .from('pre_analise')
            .select('*')
            .in('status', ['aprovado', 'reprovado']);

        if (error) {
            console.error('Error fetching analysis results:', error);
            return [];
        }
        return data || [];
    }

    static async efetuarPreAnalise(produtoId: string): Promise<PreAnaliseProduto> {
        // Implementation for changing status would go here
        throw new Error('Efetuar Pré-Análise não implementado no backend.');
    }
}
