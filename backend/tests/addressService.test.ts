import { AddressService, Address } from '../services/addressService';
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

    // Create the chain
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

const mockAddress: Address = {
    id: '123',
    street: 'Test St',
    city: 'Test City',
    state: 'TS'
};

describe('AddressService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create an address', async () => {
        mockChain(mockAddress);
        const result = await AddressService.create(mockAddress);
        expect(result).toEqual(mockAddress);
    });

    it('should throw on create error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(AddressService.create(mockAddress)).rejects.toThrow('Error');
    });

    it('should get an address by ID', async () => {
        mockChain(mockAddress);
        const result = await AddressService.getById('123');
        expect(result).toEqual(mockAddress);
    });

    it('should return null on get by ID error', async () => {
        mockChain(null, { message: 'Error' });
        const result = await AddressService.getById('123');
        expect(result).toBeNull();
    });

    it('should update an address', async () => {
        mockChain(mockAddress);
        const result = await AddressService.update('123', {});
        expect(result).toEqual(mockAddress);
    });

    it('should throw on update error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(AddressService.update('123', {})).rejects.toThrow('Error');
    });

    it('should delete an address', async () => {
        mockChain(null);
        await AddressService.delete('123');
        expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should throw on delete error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(AddressService.delete('123')).rejects.toThrow('Error');
    });

    it('should list all addresses', async () => {
        mockChain([mockAddress]); // list awaits the query directly
        const result = await AddressService.list();
        expect(result).toHaveLength(1);
    });

    it('should throw on list error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(AddressService.list()).rejects.toThrow('Error');
    });
});
