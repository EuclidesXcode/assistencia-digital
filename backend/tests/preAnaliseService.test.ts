import { PreAnaliseService } from '../services/preAnaliseService';
import { mockPendentes } from '../data/mockPreAnalise';

describe('PreAnaliseService', () => {
    it('should get pendentes', async () => {
        const res = await PreAnaliseService.getPendentes();
        expect(Array.isArray(res)).toBe(true);
    });

    it('should get resultados', async () => {
        const res = await PreAnaliseService.getResultados();
        expect(Array.isArray(res)).toBe(true);
    });

    it('should efetuar pre analise', async () => {
        // Need a valid ID from mockPendentes
        const pendentes = await PreAnaliseService.getPendentes();
        if (pendentes.length > 0) {
            const id = pendentes[0].id;
            const res = await PreAnaliseService.efetuarPreAnalise(id);
            expect(res.id).toBe(id);
        } else {
            await expect(PreAnaliseService.efetuarPreAnalise('invalid')).rejects.toThrow();
        }
    });

    it('should throw if id not found', async () => {
        await expect(PreAnaliseService.efetuarPreAnalise('non-existent-id')).rejects.toThrow('Produto não encontrado');
    });
});
