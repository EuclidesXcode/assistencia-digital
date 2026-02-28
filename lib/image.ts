
/**
 * Converts a File to a base64 data URL string (e.g. "data:image/jpeg;base64,...").
 * @param file Any File object.
 * @returns A Promise resolving to the base64 data URL string.
 */
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao converter imagem para base64'));
        reader.readAsDataURL(file);
    });
}

/**
 * Processes an image (resize to max HD) and returns it as a base64 data URL.
 * Combines processImage + fileToBase64 in a single call.
 * @param file The input image File.
 * @param maxDimension Maximum dimension in pixels. Default is 720.
 * @returns A Promise resolving to the base64 data URL string.
 */
export async function processImageToBase64(file: File, maxDimension: number = 720): Promise<string> {
    const processed = await processImage(file, maxDimension);
    return fileToBase64(processed);
}

/**
 * Processes an image file to ensure it's within HD resolution (max 720px width or height).
 * Maintains aspect ratio.
 * @param file The input image File
 * @param maxDimension Maximum dimension (width or height) in pixels. Default is 720 (HD).
 * @returns A Promise resolving to the processed File.
 */
export async function processImage(file: File, maxDimension: number = 720): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        reader.onerror = (e) => {
            reject(new Error('Error reading file'));
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions if image exceeds maxDimension
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height *= maxDimension / width));
                    width = maxDimension;
                } else {
                    width = Math.round((width *= maxDimension / height));
                    height = maxDimension;
                }
            } else {
                // If smaller than maxDimension, return original file to avoid unnecessary re-compression
                resolve(file);
                return;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw and resize
            ctx.drawImage(img, 0, 0, width, height);

            // Convert back to File
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const optimizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(optimizedFile);
                    } else {
                        reject(new Error('Error creating image blob'));
                    }
                },
                'image/jpeg',
                0.85 // Quality 85%
            );
        };

        img.onerror = () => {
            reject(new Error('Error loading image'));
        };

        reader.readAsDataURL(file);
    });
}
