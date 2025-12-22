import { uploadEvidence } from './storage';
import { supabase } from './supabase';

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid')
}));

jest.mock('./supabase', () => ({
    supabase: {
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
                getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'url' } })
            }))
        }
    }
}));

describe('Storage Lib', () => {
    it('should be defined', () => {
        expect(uploadEvidence).toBeDefined();
    });

    it('should upload evidence', async () => {
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        const url = await uploadEvidence(file, 'bucket/path');
        expect(url.url).toBe('url');
    });
});
