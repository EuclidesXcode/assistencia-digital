import { ClientService, Client } from '../services/clientService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            then: jest.fn().mockImplementation((cb) => cb({ data: [], error: null }))
        }))
    }
}));

const mockClient: Client = {
    id: 'client-123',
    owner_id: 'owner-1',
    person_type: 'INDIVIDUAL',
    full_name: 'Client A'
};

const mockSupabase = supabase as unknown as {
    from: jest.Mock;
};

describe('ClientService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a client', async () => {
        const insertMock = jest.fn().mockReturnThis();
        const singleMock = jest.fn().mockResolvedValue({ data: mockClient, error: null });

        mockSupabase.from.mockReturnValue({
            insert: insertMock,
            select: jest.fn().mockReturnThis(),
            single: singleMock
        });

        const result = await ClientService.create(mockClient);
        expect(result).toEqual(mockClient);
    });

    it('should get a client by ID', async () => {
        const singleMock = jest.fn().mockResolvedValue({ data: mockClient, error: null });
        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: singleMock
        });

        const result = await ClientService.getById('client-123');
        expect(result).toEqual(mockClient);
    });

    it('should update client', async () => {
        const singleMock = jest.fn().mockResolvedValue({ data: mockClient, error: null });
        mockSupabase.from.mockReturnValue({
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: singleMock
        });
        const res = await ClientService.update('1', {});
        expect(res).toBeDefined();
    });

    it('should delete client', async () => {
        const eqMock = jest.fn().mockReturnThis();
        mockSupabase.from.mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            eq: eqMock
        });
        await ClientService.delete('1');
        expect(eqMock).toHaveBeenCalledWith('id', '1');
    });

    it('should list clients', async () => {
        const promiseChain = {
            data: [mockClient],
            error: null,
            eq: jest.fn().mockReturnThis(),
            then: (cb: any) => Promise.resolve(cb({ data: [mockClient], error: null }))
        };
        mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(promiseChain) });

        const res = await ClientService.list();
        expect(res.length).toBeGreaterThan(0);
    });
});
