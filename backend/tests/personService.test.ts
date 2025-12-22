import { PersonService, Person } from '../services/personService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn()
    }
}));

const mockPerson: Person = {
    id: 'person-123',
    company_id: 'comp-1',
    role_type: 'Partner',
    full_name: 'Person A'
};

const mockSupabase = supabase as unknown as {
    from: jest.Mock;
};

describe('PersonService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a person', async () => {
        const insertMock = jest.fn().mockReturnThis();
        const singleMock = jest.fn().mockResolvedValue({ data: mockPerson, error: null });

        mockSupabase.from.mockReturnValue({
            insert: insertMock,
            select: jest.fn().mockReturnThis(),
            single: singleMock
        });

        const result = await PersonService.create(mockPerson);
        expect(result).toEqual(mockPerson);
    });

    it('should get a person by ID', async () => {
        const singleMock = jest.fn().mockResolvedValue({ data: mockPerson, error: null });
        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: singleMock
        });

        const result = await PersonService.getById('person-123');
        expect(result).toEqual(mockPerson);
    });

    it('should update person', async () => {
        const singleMock = jest.fn().mockResolvedValue({ data: mockPerson, error: null });
        mockSupabase.from.mockReturnValue({
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: singleMock
        });
        const res = await PersonService.update('1', {});
        expect(res).toBeDefined();
    });

    it('should delete person', async () => {
        const eqMock = jest.fn().mockReturnThis();
        mockSupabase.from.mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            eq: eqMock
        });
        await PersonService.delete('1');
        expect(eqMock).toHaveBeenCalled();
    });

    it('should list people', async () => {
        const promiseChain = {
            data: [mockPerson],
            error: null,
            eq: jest.fn().mockReturnThis(),
            then: (cb: any) => Promise.resolve(cb({ data: [mockPerson], error: null }))
        };
        mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(promiseChain) });
        const res = await PersonService.list();
        expect(res.length).toBeGreaterThan(0);
    });
});
