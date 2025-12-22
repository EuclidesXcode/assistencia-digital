import { EntityService, Entity } from '../services/entityService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn()
    }
}));

const mockEntity: Entity = {
    id: 'entity-123',
    entity_type: 'SUPPLIER',
    name: 'Supplier A'
};

const mockSupabase = supabase as unknown as {
    from: jest.Mock;
};

describe('EntityService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create an entity', async () => {
        const insertMock = jest.fn().mockReturnThis();
        const singleMock = jest.fn().mockResolvedValue({ data: mockEntity, error: null });

        mockSupabase.from.mockReturnValue({
            insert: insertMock,
            select: jest.fn().mockReturnThis(),
            single: singleMock
        });

        const result = await EntityService.create(mockEntity);
        expect(result).toEqual(mockEntity);
    });

    it('should get an entity by ID', async () => {
        const singleMock = jest.fn().mockResolvedValue({ data: mockEntity, error: null });
        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: singleMock
        });

        const result = await EntityService.getById('entity-123');
        expect(result).toEqual(mockEntity);
    });

    it('should update entity', async () => {
        const singleMock = jest.fn().mockResolvedValue({ data: mockEntity, error: null });
        mockSupabase.from.mockReturnValue({
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: singleMock
        });
        const res = await EntityService.update('1', {});
        expect(res).toBeDefined();
    });

    it('should delete entity', async () => {
        const eqMock = jest.fn().mockReturnThis();
        mockSupabase.from.mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            eq: eqMock
        });
        await EntityService.delete('1');
        expect(eqMock).toHaveBeenCalled();
    });

    it('should list entities', async () => {
        const promiseChain = {
            data: [mockEntity],
            error: null,
            eq: jest.fn().mockReturnThis(),
            then: (cb: any) => Promise.resolve(cb({ data: [mockEntity], error: null }))
        };
        mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(promiseChain) });
        const res = await EntityService.list();
        expect(res.length).toBeGreaterThan(0);
    });
});
