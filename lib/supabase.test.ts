
import { supabase } from './supabase';

describe('Supabase Lib', () => {
    it('should export supabase client', () => {
        expect(supabase).toBeDefined();
        expect(supabase.from).toBeDefined();
    });
});
