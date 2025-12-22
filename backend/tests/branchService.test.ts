import { BranchService, Branch } from '../services/branchService';
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

const mockBranch: Branch = {
    id: 'branch-123',
    branch_name: 'Headquarters',
    is_headquarters: true
};

describe('BranchService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a branch', async () => {
        mockChain(mockBranch);
        const result = await BranchService.create(mockBranch);
        expect(result).toEqual(mockBranch);
    });

    it('should throw on create error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(BranchService.create(mockBranch)).rejects.toThrow('Error');
    });

    it('should get a branch by ID', async () => {
        mockChain(mockBranch);
        const result = await BranchService.getById('branch-123');
        expect(result).toEqual(mockBranch);
    });

    it('should return null on get by ID error', async () => {
        mockChain(null, { message: 'Error' });
        const result = await BranchService.getById('branch-123');
        expect(result).toBeNull();
    });

    it('should update a branch', async () => {
        mockChain(mockBranch);
        const result = await BranchService.update('branch-123', {});
        expect(result).toEqual(mockBranch);
    });

    it('should throw on update error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(BranchService.update('branch-123', {})).rejects.toThrow('Error');
    });

    it('should delete a branch', async () => {
        mockChain(null);
        await BranchService.delete('branch-123');
        expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should throw on delete error', async () => {
        mockChain(null, { message: 'Error' });
        await expect(BranchService.delete('branch-123')).rejects.toThrow('Error');
    });

    it('should list branches', async () => {
        mockChain([mockBranch]);
        const result = await BranchService.list();
        expect(result).toEqual([mockBranch]);
    });

    it('should list branches with filters', async () => {
        mockChain([mockBranch]);
        const result = await BranchService.list({ company_id: '123' });
        expect(result).toEqual([mockBranch]);
    });
});
