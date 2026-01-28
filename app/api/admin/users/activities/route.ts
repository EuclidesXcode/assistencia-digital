import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatorio.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const atividades = (data || []).map((log: any) => ({
      id: log.id,
      usuarioId: log.user_id,
      acao: log.action,
      modulo: log.resource || 'Sistema',
      data: log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '',
      detalhes: log.details ? JSON.stringify(log.details) : (log.resource || '')
    }));

    return NextResponse.json({ atividades });
  } catch (error) {
    console.error('User activities error:', error);
    return NextResponse.json({ error: 'Erro ao buscar atividades.' }, { status: 500 });
  }
}
