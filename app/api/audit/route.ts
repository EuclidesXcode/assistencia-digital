import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.userId || !body?.action || !body?.resource) {
      return NextResponse.json({ error: 'Campos obrigatorios ausentes.' }, { status: 400 });
    }

    const payload = {
      user_id: body.userId,
      action: body.action,
      resource: body.resource,
      resource_id: body.resourceId || null,
      details: body.details || null,
      ip_address: body.ipAddress || null,
      user_agent: body.userAgent || null
    };

    const { error } = await supabaseAdmin.from('audit_logs').insert(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({ error: 'Erro ao registrar auditoria.' }, { status: 500 });
  }
}
