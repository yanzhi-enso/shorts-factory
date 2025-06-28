// GCS configuration constants
export const GCS_CONFIG = {
    BUCKET_NAME: 'shorts-scenes',
    BASE_URL: 'https://storage.googleapis.com',
    FOLDERS: {
        ELEMENT_IMAGES: 'element_img',
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
    ELEMENT_IMAGES: 'ELEMENT_IMAGES',
    GENERATED_SCENE_IMAGES: 'GENERATED_SCENE_IMAGES',
    CLIPS: 'CLIPS'
};
