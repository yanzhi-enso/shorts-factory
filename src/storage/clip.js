/**
 * Clip-related database operations
 * Handles scene clips
 */

import { database, STORES } from './db.js';
import { deleteGCSAssets } from 'services/backend.js';

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

/**
 * Delete a scene clip and its GCS asset
 */
export async function deleteSceneClip(clipId) {
    try {
        // Step 1: Get clip data and delete from database in a single transaction
        const tx = await database.transaction([STORES.SCENE_CLIPS], 'readwrite');
        const store = tx.objectStore(STORES.SCENE_CLIPS);

        const clip = await new Promise((resolve, reject) => {
            const getRequest = store.get(clipId);
            getRequest.onsuccess = () => {
                const clip = getRequest.result;
                if (!clip) {
                    resolve(null); // Clip doesn't exist
                    return;
                }

                // Delete from database immediately after getting the data
                const deleteRequest = store.delete(clipId);
                deleteRequest.onsuccess = () => resolve(clip);
                deleteRequest.onerror = () => reject(deleteRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });

        // Step 2: If clip didn't exist, return success
        if (!clip) {
            return true;
        }

        // Step 3: Transaction is now complete, delete from GCS outside transaction
        if (clip.gcs_url) {
            try {
                await deleteGCSAssets([clip.gcs_url]);
            } catch (error) {
                // Log GCS cleanup failure but don't fail the main operation
                console.warn('GCS cleanup failed for clip:', clip.gcs_url, error);
            }
        }

        return true;
    } catch (error) {
        throw new Error(`Failed to delete scene clip: ${error.message}`);
    }
}
