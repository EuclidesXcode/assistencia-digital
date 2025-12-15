import { Registro } from '../models/Orcamento';
import { mockOrcamentos } from '../data/mockOrcamentos';

export class OrcamentoService {
    static async getRegistros(): Promise<Registro[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockOrcamentos;
    }

    static async getRegistrosByMarca(marca: string): Promise<Registro[]> {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (marca === 'TODAS') {
            return mockOrcamentos;
        }
        // Filter by marca (would be implemented based on business logic)
        return mockOrcamentos;
    }
}
