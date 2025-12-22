import { NfeService } from '../services/nfeService';

describe('NfeService', () => {
    it('should get notas', async () => {
        const notas = await NfeService.getNotas();
        expect(Array.isArray(notas)).toBe(true);
    });

    it.skip('should carregar xml (browser only)', async () => {
        // This test requires DOMParser and File API which are not available in Node environment
        // @ts-ignore
        const nota = await NfeService.carregarXml();
        expect(nota.chave).toBeDefined();
    });

    it('should get stats', async () => {
        const stats = await NfeService.getStats();
        expect(stats.total).toBeDefined();
        expect(typeof stats.pendentes).toBe('number');
    });
});
