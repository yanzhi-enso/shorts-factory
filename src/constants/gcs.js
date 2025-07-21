// GCS configuration constants
export const GCS_CONFIG = {
    BUCKET_NAME: 'shorts-scenes',
    BASE_URL: 'https://storage.googleapis.com',
    FOLDERS: {
        REFERENCE_SCENE_IMAGES: 'reference_scene_images',
        ELEMENT_IMAGES: 'element_images',
        GENERATED_SCENE_IMAGES: 'generated_scene_images',
        CLIPS: 'clips'
    },
    CONTENT_TYPES: {
        IMAGE: 'image/png',
        VIDEO: 'video/mp4'
    },
    FILE_EXTENSIONS: {
        IMAGE: '.png',
        VIDEO: '.mp4'
    },
    RETRY_CONFIG: {
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000 // 1 second
    }
};

// Asset type constants for client usage
export const ASSET_TYPES = {
    REFERENCE_SCENE_IMAGE: 'REFERENCE_SCENE_IMAGES',
    ELEMENT_IMAGES: 'ELEMENT_IMAGES',
    GENERATED_SCENE_IMAGES: 'GENERATED_SCENE_IMAGES',
    CLIPS: 'CLIPS'
};

/**
 * Get asset folder name from asset type
 * @param {string} assetType - Asset type (ELEMENT_IMAGES, GENERATED_SCENE_IMAGES, CLIPS)
 * @returns {string} Folder name
 * @throws {Error} If asset type is invalid
 */
export function getAssetFolder(assetType) {
    if (!assetType || !GCS_CONFIG.FOLDERS[assetType]) {
        throw new Error(`Invalid asset type: ${assetType}. Valid types: ${Object.keys(GCS_CONFIG.FOLDERS).join(', ')}`);
    }
    return GCS_CONFIG.FOLDERS[assetType];
}
