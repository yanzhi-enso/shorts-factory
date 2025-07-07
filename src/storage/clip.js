/**
 * Clip-related database operations
 * Handles scene clips
 */

import { database, STORES } from './db.js';

// ==================== SCENE_CLIPS TABLE OPERATIONS ====================

/**
 * Get scene clips for a scene
 */
export async function getSceneClips(sceneId) {
    const tx = await database.transaction([STORES.SCENE_CLIPS]);
    const store = tx.objectStore(STORES.SCENE_CLIPS);
    const index = store.index('scene_id');

    return new Promise((resolve, reject) => {
        const request = index.getAll(sceneId);
        request.onsuccess = () => {
            // Sort by created_at descending (newest first)
            const clips = request.result.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            resolve(clips);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Add a scene clip
 */
export async function addSceneClip(sceneId, gcsUrl, generationSources) {
    const tx = await database.transaction([STORES.SCENE_CLIPS], 'readwrite');
    const store = tx.objectStore(STORES.SCENE_CLIPS);

    const sceneClip = {
        scene_id: sceneId,
        gcs_url: gcsUrl,
        generation_sources: generationSources || null,
        created_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
        const request = store.add(sceneClip);
        request.onsuccess = () => {
            resolve({ ...sceneClip, id: request.result });
        };
        request.onerror = () => reject(request.error);
    });
}
