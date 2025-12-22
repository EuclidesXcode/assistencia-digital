import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Server-side only: Use service role key
// Helper to get admin client safely
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error('Configuração incompleta: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY faltando.');
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

export async function POST(req: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await req.json();
        const { email, password, nome, filial, cargo, permissoes } = body;

        // 1. Create User in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm
            user_metadata: {
                full_name: nome,
                branch_code: filial, // Assuming filial string is branch_code or similar
            },
        });

        if (authError) throw authError;

        if (!authUser.user) throw new Error('Falha ao criar usuário Auth');

        // 2. Profile creation is handled by Trigger (from V6 migration)
        // However, trigger only sets basic fields. Admin might want to set specific Role/Permissions immediately.
        // We can update the profile strictly after creation to ensure correct role/permissions

        // Default trigger might set role='user'. Admin form provides 'cargo'.
        // We update the profile to match admin selection.

        // Wait for trigger (minor race condition) or simply upsert. 
        // Best practice: direct update.

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: cargo, // Ensure cargo matches the role field (e.g. 'Administrador' -> 'admin' mapping might be needed if values differ)
                permissions: permissoes
            })
            .eq('id', authUser.user.id);

        if (profileError) {
            console.error('Error updating profile role:', profileError);
            // Don't fail the whole request, but log it
        }

        // Return the created user structure expected by frontend
        return NextResponse.json({
            id: authUser.user.id,
            nome,
            email,
            filial,
            cargo,
            permissoes: permissoes || [],
            ativo: true,
            ultimoAcesso: 'Nunca',
            dataCriacao: new Date().toLocaleDateString('pt-BR')
        });

    } catch (error: any) {
        console.error('API Error creating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
