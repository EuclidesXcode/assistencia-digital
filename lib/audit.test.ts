
import { createAuditLog } from './audit';

const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue(''),
});

// @ts-ignore
global.fetch = fetchMock;

describe('Audit Lib', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue('')
        });
    });

    it('should create audit log', async () => {
        const mockEntry = { userId: '1', action: 'TEST', resource: 'test' };
        await createAuditLog(mockEntry);
        // Basic smoke test: should call fetch without throwing.
    });
});
