import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const total = (profiles || []).length;
    const ativos = (profiles || []).filter((p: any) => p.is_active).length;
    const inativos = total - ativos;

    const today = new Date().toISOString().split('T')[0];
    const { count, error: countError } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    return NextResponse.json({
      total,
      ativos,
      inativos,
      atividadesHoje: count || 0
    });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatisticas.' }, { status: 500 });
  }
}
