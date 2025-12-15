import { Registro } from '../models/Recebimento';
import { mockRecebimentos } from '../data/mockRecebimentos';

export class RecebimentoService {
    static async getRegistros(): Promise<Registro[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockRecebimentos;
    }

    static async efetuarRecebimento(ids: string[]): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 500));
        // In a real implementation, this would process the selected items
        console.log('Recebimento efetuado para IDs:', ids);
    }
}
