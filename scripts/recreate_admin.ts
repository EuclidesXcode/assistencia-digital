import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME || 'Admin';
const adminBranch = process.env.ADMIN_BRANCH || '0001';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function recreateAdmin() {
  console.log('Creating admin user via custom auth...');

  const { data, error } = await supabase
    .rpc('create_app_user', {
      p_email: adminEmail,
      p_password: adminPassword,
      p_matriz_filial: adminBranch,
      p_full_name: adminName,
      p_role: 'admin',
      p_permissions: ['admin']
    })
    .single();

  if (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }

  console.log('Admin created:', {
    id: data?.id,
    email: data?.email,
    branch: data?.matriz_filial
  });
}

recreateAdmin();
