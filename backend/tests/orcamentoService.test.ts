import { OrcamentoService } from '../services/orcamentoService';

describe('OrcamentoService', () => {
    it('should get registros', async () => {
        const result = await OrcamentoService.getRegistros();
        expect(Array.isArray(result)).toBe(true);
    });

    it('should get registros by marca', async () => {
        const resultAll = await OrcamentoService.getRegistrosByMarca('TODAS');
        expect(Array.isArray(resultAll)).toBe(true);
        const resultSpecific = await OrcamentoService.getRegistrosByMarca('SAMSUNG');
        expect(Array.isArray(resultSpecific)).toBe(true);
    });
});
