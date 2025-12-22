import { RecebimentoService } from '../services/recebimentoService';

describe('RecebimentoService', () => {
    it('should get registros', async () => {
        const res = await RecebimentoService.getRegistros();
        expect(Array.isArray(res)).toBe(true);
    });

    it('should efetuar recebimento', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        await RecebimentoService.efetuarRecebimento(['1', '2']);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
