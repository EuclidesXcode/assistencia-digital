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
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},global.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar notificacoes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      user_id: body.userId || null,
      global: Boolean(body.global || false),
      type: body.type,
      title: body.title,
      message: body.message,
      link: body.link,
      permission: body.permission,
      read: false,
      created_at: new Date()
    };

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar notificacao.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.all && body?.userId) {
      await supabaseAdmin.from('notifications').update({ read: true }).eq('user_id', body.userId);
      return NextResponse.json({ ok: true });
    }

    if (!body?.id) {
      return NextResponse.json({ error: 'id obrigatorio.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar notificacao.' }, { status: 500 });
  }
}
