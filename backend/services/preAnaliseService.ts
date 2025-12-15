import { Produto } from '../models/PreAnalise';
import { mockPendentes, mockResultados } from '../data/mockPreAnalise';

export class PreAnaliseService {
    static async getPendentes(): Promise<Produto[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockPendentes;
    }

    static async getResultados(): Promise<Produto[]> {
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockResultados;
    }

    static async efetuarPreAnalise(produtoId: string): Promise<Produto> {
        await new Promise(resolve => setTimeout(resolve, 500));

        const index = mockPendentes.findIndex(p => p.id === produtoId);
        if (index === -1) {
            throw new Error('Produto não encontrado');
        }

        const produto = mockPendentes[index];
        mockPendentes.splice(index, 1);
        mockResultados.unshift(produto);

        return produto;
    }
}
