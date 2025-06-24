import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { GCS_CONFIG } from '../constants/gcs.js';

// Initialize Google Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(GCS_CONFIG.BUCKET_NAME);

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate GCS file path following the project structure
 * @param {string} projectId - Project ID
 * @param {string} folder - Folder name (generated_img or clips)
 * @param {string} fileId - Unique file ID
 * @param {string} extension - File extension (.png, .mp4)
 * @returns {string} GCS file path
 */
export function generateGCSPath(projectId, folder, fileId, extension) {
    return `${projectId}/${folder}/${fileId}${extension}`;
}

/**
 * Generate public GCS URL
 * @param {string} filePath - GCS file path
 * @returns {string} Public URL
 */
export function getPublicGCSUrl(filePath) {
    return `${GCS_CONFIG.BASE_URL}/${GCS_CONFIG.BUCKET_NAME}/${filePath}`;
}

/**
 * Upload base64 data to GCS with retry logic
 * @param {string} base64Data - Base64 encoded data (without data URL prefix)
 * @param {string} projectId - Project ID
 * @param {string} contentType - MIME type
 * @param {string} fileExtension - File extension
 * @returns {Promise<{success: boolean, gcsUrl?: string, error?: string}>}
 */
export async function uploadBase64ToGCS(base64Data, projectId, contentType, fileExtension) {
    const fileId = randomUUID();
    const folder = contentType === GCS_CONFIG.CONTENT_TYPES.IMAGE 
        ? GCS_CONFIG.FOLDERS.GENERATED_IMAGES 
        : GCS_CONFIG.FOLDERS.CLIPS;
    
    const filePath = generateGCSPath(projectId, folder, fileId, fileExtension);
    const file = bucket.file(filePath);
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    for (let attempt = 1; attempt <= GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`Uploading base64 to GCS (attempt ${attempt}/${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES}): ${filePath}`);
            
            await file.save(buffer, {
                metadata: {
                    contentType: contentType,
                },
                public: true,
                validation: 'md5'
            });
            
            const publicUrl = getPublicGCSUrl(filePath);
            console.log(`Successfully uploaded to GCS: ${publicUrl}`);
            
            return {
                success: true,
                gcsUrl: publicUrl,
                fileId: fileId
            };
            
        } catch (error) {
            console.error(`GCS upload attempt ${attempt} failed:`, error);
            
            if (attempt === GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES) {
                return {
                    success: false,
                    error: `Failed to upload to GCS after ${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES} attempts: ${error.message}`
                };
            }
            
            // Wait before retry
            await sleep(GCS_CONFIG.RETRY_CONFIG.RETRY_DELAY * attempt);
        }
    }
}

/**
 * Download content from URL and upload to GCS with retry logic
 * @param {string} url - Source URL to download from
 * @param {string} projectId - Project ID
 * @param {string} contentType - MIME type
 * @param {string} fileExtension - File extension
 * @returns {Promise<{success: boolean, gcsUrl?: string, error?: string}>}
 */
export async function downloadAndUploadToGCS(url, projectId, contentType, fileExtension) {
    const fileId = randomUUID();
    const folder = contentType === GCS_CONFIG.CONTENT_TYPES.IMAGE 
        ? GCS_CONFIG.FOLDERS.GENERATED_IMAGES 
        : GCS_CONFIG.FOLDERS.CLIPS;
    
    const filePath = generateGCSPath(projectId, folder, fileId, fileExtension);
    const file = bucket.file(filePath);
    
    for (let attempt = 1; attempt <= GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`Downloading and uploading to GCS (attempt ${attempt}/${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES}): ${url} -> ${filePath}`);
            
            // Download from source URL
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download from ${url}: ${response.status} ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Upload to GCS
            await file.save(buffer, {
                metadata: {
                    contentType: contentType,
                },
                public: true,
                validation: 'md5'
            });
            
            const publicUrl = getPublicGCSUrl(filePath);
            console.log(`Successfully downloaded and uploaded to GCS: ${publicUrl}`);
            
            return {
                success: true,
                gcsUrl: publicUrl,
                fileId: fileId
            };
            
        } catch (error) {
            console.error(`Download and upload attempt ${attempt} failed:`, error);
            
            if (attempt === GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES) {
                return {
                    success: false,
                    error: `Failed to download and upload to GCS after ${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES} attempts: ${error.message}`
                };
            }
            
            // Wait before retry
            await sleep(GCS_CONFIG.RETRY_CONFIG.RETRY_DELAY * attempt);
        }
    }
}

/**
 * Replace URLs in a nested object/array structure
 * @param {any} obj - Object to process
 * @param {Map<string, string>} urlMapping - Map of old URL -> new URL
 * @returns {any} Object with URLs replaced
 */
export function replaceUrlsInResponse(obj, urlMapping) {
    if (typeof obj === 'string') {
        return urlMapping.get(obj) || obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => replaceUrlsInResponse(item, urlMapping));
    }
    
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = replaceUrlsInResponse(value, urlMapping);
        }
        return result;
    }
    
    return obj;
}
