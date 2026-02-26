import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isAuditUserFkError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const detail = String(error?.detail || error?.details || '').toLowerCase();
  const source = `${message} ${detail}`;

  return (
    error?.code === '23503' &&
    (source.includes('audit_logs_user_id_fkey') ||
      source.includes('foreign key') ||
      source.includes('violates foreign key constraint'))
  );
}

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
    if (error && isAuditUserFkError(error)) {
      const fallbackDetails =
        payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
          ? {
              ...payload.details,
              originalUserId: body.userId,
              auditFallback: 'user_id_fk_violation'
            }
          : {
              originalDetails: payload.details ?? null,
              originalUserId: body.userId,
              auditFallback: 'user_id_fk_violation'
            };

      const { error: retryError } = await supabaseAdmin.from('audit_logs').insert({
        ...payload,
        user_id: null,
        details: fallbackDetails
      });

      if (retryError) {
        return NextResponse.json({ error: retryError.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, fallback: 'user_id_removed' });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({ error: 'Erro ao registrar auditoria.' }, { status: 500 });
  }
}
