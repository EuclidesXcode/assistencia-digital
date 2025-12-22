import { CompanyService, Company } from '../services/companyService';
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

const mockCompany: Company = {
    id: 'comp-123',
    owner_id: 'owner-123',
    legal_name: 'Test Corp Ltda',
    cnpj: '12.345.678/0001-90'
};

describe('CompanyService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a company', async () => {
        mockChain(mockCompany);
        const result = await CompanyService.create(mockCompany);
        expect(result).toEqual(mockCompany);
    });

    it('should throw on create error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(CompanyService.create(mockCompany)).rejects.toThrow('Error');
    });

    it('should get a company by ID', async () => {
        mockChain(mockCompany);
        const result = await CompanyService.getById('comp-123');
        expect(result).toEqual(mockCompany);
    });

    it('should return null on get by ID error', async () => {
        mockChain(null, { message: 'Error' });
        const result = await CompanyService.getById('comp-123');
        expect(result).toBeNull();
    });

    it('should update a company', async () => {
        mockChain(mockCompany);
        const result = await CompanyService.update('comp-123', { legal_name: 'New Name' });
        expect(result).toEqual(mockCompany);
    });

    it('should throw on update error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(CompanyService.update('comp-123', {})).rejects.toThrow('Error');
    });

    it('should delete a company', async () => {
        mockChain(null);
        await CompanyService.delete('comp-123');
        expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should throw on delete error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(CompanyService.delete('comp-123')).rejects.toThrow('Error');
    });

    it('should list companies', async () => {
        mockChain([mockCompany]);
        const result = await CompanyService.list();
        expect(result).toEqual([mockCompany]);
    });
});
