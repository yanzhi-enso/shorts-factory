// GCS configuration constants
export const GCS_CONFIG = {
    BUCKET_NAME: 'shorts-scenes',
    BASE_URL: 'https://storage.googleapis.com',
    FOLDERS: {
        GENERATED_IMAGES: 'generated_img',
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
