import { NextRequest, NextResponse } from 'next/server';
import {
  hasSupabaseAdminConfig,
  supabaseAdmin,
  supabaseAdminConfigError,
} from '@/lib/supabaseAdmin';

const DEFAULT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  'evidences';

function normalizeBucketName(value: unknown) {
  return String(value || DEFAULT_BUCKET).trim();
}

function isAlreadyExistsError(error: unknown) {
  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('already exists') || message.includes('duplicate');
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig) {
    return NextResponse.json(
      {
        error:
          'Configuracao do servidor incompleta. Defina SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.',
        details: supabaseAdminConfigError,
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bucket = normalizeBucketName(body?.bucket);

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket obrigatorio.' }, { status: 400 });
    }

    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      return NextResponse.json(
        { error: `Erro ao listar buckets: ${String(listError.message || listError)}` },
        { status: 400 }
      );
    }

    const exists = (existingBuckets || []).some((item) => item.name === bucket);
    if (exists) {
      return NextResponse.json({ ok: true, bucket, created: false });
    }

    const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
    });

    if (createError && !isAlreadyExistsError(createError)) {
      return NextResponse.json(
        { error: `Erro ao criar bucket "${bucket}": ${String(createError.message || createError)}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, bucket, created: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro interno ao garantir bucket: ${String(error?.message || error)}` },
      { status: 500 }
    );
  }
}
