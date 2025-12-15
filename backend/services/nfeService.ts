import { Nota } from '../models/NfeXml';
import { mockNotas } from '../data/mockNfe';

export class NfeService {
    static async getNotas(): Promise<Nota[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockNotas;
    }

    static async carregarXml(file?: File): Promise<Nota> {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate a new mock nota
        const newNota: Nota = {
            chave: Math.random().toString(36).slice(2, 18).toUpperCase(),
            numero: String(100000 + mockNotas.length + 1),
            emissao: new Date().toLocaleDateString('pt-BR'),
            itens: Math.floor(Math.random() * 5) + 1,
            status: ['PENDENTE', 'PARCIAL', 'DIVERGENTE', 'CONFERIDA'][Math.floor(Math.random() * 4)] as Nota['status']
        };

        mockNotas.unshift(newNota);
        return newNota;
    }

    static async getStats() {
        const notas = await this.getNotas();
        return {
            total: notas.length,
            pendentes: notas.filter(n => n.status === 'PENDENTE').length,
            parciais: notas.filter(n => n.status === 'PARCIAL').length,
            divergentes: notas.filter(n => n.status === 'DIVERGENTE').length,
            conferidas: notas.filter(n => n.status === 'CONFERIDA').length,
        };
    }
}
