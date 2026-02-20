import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function mapProduct(data: any) {
  const brand =
    data.marca ??
    data.fabricante ??
    data.modelo_fabricante ??
    data.brand ??
    data.manufacturer ??
    null;

  return {
    id: data.id,
    ean: data.ean ?? data.gtin ?? '',
    modeloRef: data.modelo_ref ?? data.modelo ?? data.modelo_fabricante ?? '',
    marca: brand || 'N/A',
    nfs: data.nfs_data ?? data.nfs ?? [],
    modelos: data.modelos_data ?? data.modelos ?? [],
    embalagem: data.embalagem || [],
    acessorios: data.acessorios || [],
    estetica: data.estetica || [],
    funcional: data.funcional || [],
    funcionalidade: data.funcionalidade || [],
    fotos: data.fotos || [],
    manualUrl: data.manual_url ?? data.manual ?? null,
    estoqueAtual: data.estoque_atual ?? data.estoque ?? 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get('ean');

  if (!ean) {
    return NextResponse.json({ error: 'EAN is required' }, { status: 400 });
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ found: false }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapProduct(data));
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
