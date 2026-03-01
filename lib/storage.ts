import { StorageError } from '@supabase/storage-js';

export const DEFAULT_BUCKET =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
    'evidences';

export interface UploadResult {
    path: string;
    url: string;
    error: StorageError | Error | null;
}

/**
 * Generic upload function to Supabase Storage.
 */
export async function uploadFile(
    file: File,
    bucket?: string,
    folder: string = 'general'
): Promise<UploadResult> {
    try {
        const resolvedBucket = bucket || DEFAULT_BUCKET;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', resolvedBucket);
        formData.append('folder', folder);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const message =
                payload?.error ||
                `Falha ao fazer upload para o bucket "${resolvedBucket}".`;
            throw new Error(message);
        }

        const payload = await response.json();
        return {
            path: String(payload?.path || ''),
            url: String(payload?.url || ''),
            error: null
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        return { path: '', url: '', error: error as StorageError };
    }
}

/**
 * Uploads a file to the configured default bucket.
 */
export function uploadEvidence(file: File, folder: string = 'general'): Promise<UploadResult> {
    return uploadFile(file, DEFAULT_BUCKET, folder);
}

/**
 * Uploads a product image or manual to the configured default bucket.
 */
export function uploadProductFile(file: File, type: 'image' | 'manual'): Promise<UploadResult> {
    const folder = type === 'manual' ? 'produtos/manuais' : 'produtos/imagens';
    return uploadFile(file, DEFAULT_BUCKET, folder);
}
