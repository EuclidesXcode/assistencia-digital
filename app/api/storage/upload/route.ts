import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
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

function normalizeFolder(value: unknown) {
  return String(value || 'general')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

function isAlreadyExistsError(error: unknown) {
  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('already exists') || message.includes('duplicate');
}

async function ensureBucketExists(bucket: string) {
  const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw new Error(`Erro ao listar buckets: ${String(listError.message || listError)}`);
  }

  const exists = (existingBuckets || []).some((item) => item.name === bucket);
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
    public: true,
  });

  if (createError && !isAlreadyExistsError(createError)) {
    throw new Error(`Erro ao criar bucket "${bucket}": ${String(createError.message || createError)}`);
  }
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
    const formData = await req.formData();
    const bucket = normalizeBucketName(formData.get('bucket'));
    const folder = normalizeFolder(formData.get('folder'));
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo obrigatorio.' }, { status: 400 });
    }

    await ensureBucketExists(bucket);

    const fileExt = file.name.split('.').pop();
    const fileName = fileExt ? `${uuidv4()}.${fileExt}` : uuidv4();
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Erro ao fazer upload: ${String(uploadError.message || uploadError)}` },
        { status: 400 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      ok: true,
      bucket,
      path: filePath,
      url: publicUrlData.publicUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro interno no upload: ${String(error?.message || error)}` },
      { status: 500 }
    );
  }
}
