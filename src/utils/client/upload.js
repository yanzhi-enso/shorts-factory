import { getSignedUrl } from '../../services/backend';

// File validation constants
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Image Type
export const IMAGE_TYPE_ELEMENT = 'ELEMENT_IMAGES'
export const IMAGE_TYPE_GENERATED_SCENE = 'GENERATED_SCENE_IMAGES'
export const IMAGE_TYPE_REFERENCE_SCENE = 'REFERENCE_SCENE_IMAGES'

/**
 * Validate image file type and size
 */
export const validateImageFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Please select only PNG, JPEG, JPG, or WebP images' };
    }
    
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size must be less than 50MB' };
    }
    
    return { valid: true };
};

/**
 * Convert WebP image to PNG using Canvas API
 */
export const convertWebPToPNG = async (webpFile) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    // Create a new File object with PNG type
                    const pngFile = new File([blob], webpFile.name.replace(/\.webp$/i, '.png'), {
                        type: 'image/png',
                        lastModified: Date.now()
                    });
                    resolve(pngFile);
                } else {
                    reject(new Error('Failed to convert WebP to PNG'));
                }
            }, 'image/png', 1.0); // Maximum quality
        };
        
        img.onerror = () => reject(new Error('Failed to load WebP image'));
        img.src = URL.createObjectURL(webpFile);
    });
};

/**
 * Main upload function that handles file validation, conversion, and GCS upload
 * @param {File} file - The image file to upload
 * @param {string} imageType - The image type ('ELEMENT_IMAGES' or 'GENERATED_SCENE_IMAGES')
 * @param {string} projectId - The project ID
 * @returns {Promise<{success: boolean, public_url?: string, image_id?: string, error?: string}>}
 */
export const uploadImage = async (file, imageType, projectId) => {
    try {
        // 1. Validate file
        const validation = validateImageFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // 2. Handle WebP conversion if needed
        let processedFile = file;
        if (file.type === 'image/webp') {
            try {
                processedFile = await convertWebPToPNG(file);
            } catch (conversionError) {
                return { success: false, error: 'Failed to convert WebP image' };
            }
        }

        // 3. Get signed URL from backend
        const { signed_url, public_url, image_id } = await getSignedUrl(projectId, imageType);

        // 4. Upload file to GCS using signed URL
        const uploadResponse = await fetch(signed_url, {
            method: 'PUT',
            body: processedFile,
            headers: {
                'Content-Type': 'image/png'
            }
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload image to storage');
        }

        return { 
            success: true, 
            public_url, 
            image_id 
        };

    } catch (error) {
        console.error('Image upload failed:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
};
