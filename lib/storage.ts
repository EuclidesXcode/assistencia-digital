
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export const STORAGE_BUCKET = 'evidences';

export interface UploadResult {
    path: string;
    url: string;
    error: Error | null;
}

/**
 * Uploads a file to the 'evidences' bucket.
 * @param file The file object to upload.
 * @param folder Optional folder path within the bucket (e.g., 'orcamentos/123').
 */
export async function uploadEvidence(file: File, folder: string = 'general'): Promise<UploadResult> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file);

        if (error) {
            throw error;
        }

        const { data: publicUrlData } = supabase.storage
            .from(STORAGE_BUCKET)
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
