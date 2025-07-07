/**
 * Utility functions for storage operations
 */

/**
 * Parse scene information from GCS URL
 * Example: "https://storage.googleapis.com/.../project_id/video-Scene-1-1.jpg"
 * Returns: { sceneNumber: 1, imageOrder: 1 }
 */
export function parseSceneFromUrl(gcsUrl) {
    const match = gcsUrl.match(/video-Scene-(\d+)-(\d+)\./);
    if (match) {
        return {
            sceneNumber: parseInt(match[1], 10),
            imageOrder: parseInt(match[2], 10),
        };
    }
    return null;
}
