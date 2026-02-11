
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_BUCKET = 'evidences';

export interface UploadResult {
    path: string;
    url: string;
    error: any | null;
}

/**
 * Generic upload function to Supabase Storage.
 */
export async function uploadFile(
    file: File,
    bucket: string = DEFAULT_BUCKET,
    folder: string = 'general'
): Promise<UploadResult> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) {
            throw error;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return {
            path: filePath,
            url: publicUrlData.publicUrl,
            error: null
        };
    } catch (error: any) {
        console.error('Error uploading file:', error);
        return {
            path: '',
            url: '',
            error: error
        };
    }
}

/**
 * Uploads a file to the 'evidences' bucket (maintained for backward compatibility).
 */
export async function uploadEvidence(file: File, folder: string = 'general'): Promise<UploadResult> {
    return uploadFile(file, 'evidences', folder);
}

/**
 * Uploads a product image/document to the 'evidences' bucket under 'produtos' folder.
 * (Using 'evidences' bucket for now as it is confirmed to exist/work)
 */
export async function uploadProductFile(file: File, type: 'image' | 'manual'): Promise<UploadResult> {
    const folder = type === 'manual' ? 'produtos/manuais' : 'produtos/imagens';
    return uploadFile(file, 'evidences', folder);
}
