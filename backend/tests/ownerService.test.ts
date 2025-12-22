import { OwnerService, Owner } from '../services/ownerService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn()
    }
}));

const mockSupabase = supabase as unknown as {
    from: jest.Mock;
};

const mockChain = (data: any, error: any = null) => {
    const single = jest.fn().mockResolvedValue({ data, error });
    const promise = Promise.resolve({ data, error });
    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single,
        then: (onfulfilled: any) => promise.then(onfulfilled)
    };
    mockSupabase.from.mockReturnValue(chain);
    return chain;
};

const mockOwner: Owner = {
    id: 'owner-123',
    full_name: 'John Doe',
    cpf: '12345678900'
};

describe('OwnerService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create an owner', async () => {
        mockChain(mockOwner);
        const result = await OwnerService.create(mockOwner);
        expect(result).toEqual(mockOwner);
    });

    it('should throw on create error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(OwnerService.create(mockOwner)).rejects.toThrow('Error');
    });

    it('should get an owner by ID', async () => {
        mockChain(mockOwner);
        const result = await OwnerService.getById('owner-123');
        expect(result).toEqual(mockOwner);
    });

    it('should return null on get by ID error', async () => {
        mockChain(null, { message: 'Error' });
        const result = await OwnerService.getById('owner-123');
        expect(result).toBeNull();
    });

    it('should update an owner', async () => {
        mockChain(mockOwner);
        const result = await OwnerService.update('owner-123', { full_name: 'Jane Doe' });
        expect(result).toEqual(mockOwner);
    });

    it('should throw on update error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(OwnerService.update('owner-123', {})).rejects.toThrow('Error');
    });

    it('should delete an owner', async () => {
        mockChain(null);
        await OwnerService.delete('owner-123');
        expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should throw on delete error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(OwnerService.delete('owner-123')).rejects.toThrow('Error');
    });

    it('should list owners', async () => {
        mockChain([mockOwner]);
        const result = await OwnerService.list();
        expect(result).toEqual([mockOwner]);
    });
});
