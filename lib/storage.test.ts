import { uploadEvidence } from './storage';

describe('Storage Lib', () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                path: 'bucket/path/test.png',
                url: 'https://example.com/test.png'
            })
        } as any);
    });

    it('should be defined', () => {
        expect(uploadEvidence).toBeDefined();
    });

    it('should upload evidence', async () => {
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        const url = await uploadEvidence(file, 'bucket/path');
        expect(url.url).toBe('https://example.com/test.png');
    });
});
