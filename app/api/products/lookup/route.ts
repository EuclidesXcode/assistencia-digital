import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mapProduct } from '@/lib/productMapper';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get('ean');

  if (!ean) {
    return NextResponse.json({ error: 'EAN obrigatório.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('produtos')
      .select('*')
      .eq('ean', ean)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116 = "no rows" — produto não encontrado
      if (error.code === 'PGRST116') {
        return NextResponse.json({ found: false }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapProduct(data));
  } catch {
    return NextResponse.json({ error: 'Erro interno ao buscar produto.' }, { status: 500 });
  }
}
