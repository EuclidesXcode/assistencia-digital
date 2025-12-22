
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rejkmpkxlxonbkhkddvs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Teklw3P-UwS87s2LSjkl2g_ZZ-4up2B';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Fix Admin Role', () => {
    jest.setTimeout(30000);

    it('should update the admin role to Administrador', async () => {
        console.log('Logging in...');
        const email = 'euclideslione@gmail.com';
        const password = 'Eucode@2013';

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (loginError) throw loginError;

        console.log('Updating role...');
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'Administrador' })
            .eq('id', loginData.user?.id);

        if (updateError) throw updateError;

        console.log('SUCCESS: Role updated to Administrador');
    });
});
