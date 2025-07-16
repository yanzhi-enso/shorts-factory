import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import { GCS_CONFIG, getAssetFolder } from "constants/gcs.js";

// Initialize Google Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(GCS_CONFIG.BUCKET_NAME);

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate GCS file path following the project structure
 * @param {string} projectId - Project ID
 * @param {string} folder - Folder name (generated_scene_images or clips)
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
 * @param {string} assetType - Asset type key from GCS_CONFIG.FOLDERS
 * @returns {Promise<{success: boolean, gcsUrl?: string, error?: string}>}
 */
export async function uploadBase64ToGCS(
    base64Data,
    projectId,
    assetType
) {
    // Validate asset type and get folder
    let folder;
    try {
        folder = getAssetFolder(assetType);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }

    const fileId = randomUUID();
    
    // Determine content type and file extension based on asset type
    const contentType = assetType === 'CLIPS' ? GCS_CONFIG.CONTENT_TYPES.VIDEO : GCS_CONFIG.CONTENT_TYPES.IMAGE;
    const fileExtension = assetType === 'CLIPS' ? GCS_CONFIG.FILE_EXTENSIONS.VIDEO : GCS_CONFIG.FILE_EXTENSIONS.IMAGE;

    const filePath = generateGCSPath(projectId, folder, fileId, fileExtension);
    const file = bucket.file(filePath);

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    for (
        let attempt = 1;
        attempt <= GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES;
        attempt++
    ) {
        try {
            console.log(
                `Uploading base64 to GCS (attempt ${attempt}/${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES}): ${filePath}`
            );

            await file.save(buffer, {
                metadata: {
                    contentType: contentType,
                },
                validation: "md5",
            });

            const publicUrl = getPublicGCSUrl(filePath);
            console.log(`Successfully uploaded to GCS: ${publicUrl}`);

            return {
                success: true,
                gcsUrl: publicUrl,
                fileId: fileId,
            };
        } catch (error) {
            console.error(`GCS upload attempt ${attempt} failed:`, error);

            if (attempt === GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES) {
                return {
                    success: false,
                    error: `Failed to upload to GCS after ${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES} attempts: ${error.message}`,
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
 * @param {string} assetType - Asset type key from GCS_CONFIG.FOLDERS
 * @returns {Promise<{success: boolean, gcsUrl?: string, error?: string}>}
 */
export async function downloadAndUploadToGCS(
    url,
    projectId,
    assetType
) {
    // Validate asset type and get folder
    let folder;
    try {
        folder = getAssetFolder(assetType);
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }

    const fileId = randomUUID();
    
    // Determine content type and file extension based on asset type
    const contentType = assetType === 'CLIPS' ? GCS_CONFIG.CONTENT_TYPES.VIDEO : GCS_CONFIG.CONTENT_TYPES.IMAGE;
    const fileExtension = assetType === 'CLIPS' ? GCS_CONFIG.FILE_EXTENSIONS.VIDEO : GCS_CONFIG.FILE_EXTENSIONS.IMAGE;

    const filePath = generateGCSPath(projectId, folder, fileId, fileExtension);
    const file = bucket.file(filePath);

    for (
        let attempt = 1;
        attempt <= GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES;
        attempt++
    ) {
        try {
            console.log(
                `Downloading and uploading to GCS (attempt ${attempt}/${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES}): ${url} -> ${filePath}`
            );

            // Download from source URL
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(
                    `Failed to download from ${url}: ${response.status} ${response.statusText}`
                );
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Upload to GCS
            await file.save(buffer, {
                metadata: {
                    contentType: contentType,
                },
                validation: "md5",
            });

            const publicUrl = getPublicGCSUrl(filePath);
            console.log(
                `Successfully downloaded and uploaded to GCS: ${publicUrl}`
            );

            return {
                success: true,
                gcsUrl: publicUrl,
                fileId: fileId,
            };
        } catch (error) {
            console.error(
                `Download and upload attempt ${attempt} failed:`,
                error
            );

            if (attempt === GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES) {
                return {
                    success: false,
                    error: `Failed to download and upload to GCS after ${GCS_CONFIG.RETRY_CONFIG.MAX_RETRIES} attempts: ${error.message}`,
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
    if (typeof obj === "string") {
        return urlMapping.get(obj) || obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => replaceUrlsInResponse(item, urlMapping));
    }

    if (obj && typeof obj === "object") {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = replaceUrlsInResponse(value, urlMapping);
        }
        return result;
    }

    return obj;
}


/**
 * Create a Signed URL from GCS bucket
 * @param {string} projectId - Project ID
 * @param {string} assetType - Asset type (ELEMENT_IMAGES, GENERATED_IMAGES, CLIPS)
 * @returns {Promise<{success: boolean, signed_url?: string, public_url?: string, file_id?: string, error?: string}>}
 */
export async function createSignedURL(projectId, assetType) {
    try {
        // Validate inputs
        if (!projectId) {
            return {
                success: false,
                error: 'Missing project_id parameter',
            };
        }

        if (!assetType) {
            return {
                success: false,
                error: 'Missing asset_type parameter',
            };
        }

        // Validate asset type and get folder name
        let folderName;
        try {
            folderName = getAssetFolder(assetType);
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }

        // Generate unique file ID
        const fileId = randomUUID();

        // Create GCS file path following the pattern: {project_id}/{folder}/{fileId}.png
        const fileName = generateGCSPath(
            projectId,
            folderName,
            fileId,
            GCS_CONFIG.FILE_EXTENSIONS.IMAGE
        );

        // Generate signed URL for PUT operation (15 minutes expiration)
        const file = bucket.file(fileName);
        const [signedUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: GCS_CONFIG.CONTENT_TYPES.IMAGE,
        });

        // Generate public URL
        const publicUrl = getPublicGCSUrl(fileName);

        console.log(`Generated signed URL for ${fileName}`);

        return {
            success: true,
            signed_url: signedUrl,
            public_url: publicUrl,
            file_id: fileId,
        };
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return {
            success: false,
            error: `Failed to generate signed URL: ${error.message}`
        };
    }
}
