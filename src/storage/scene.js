/**
 * Scene-related database operations
 * Handles scenes, scene images, and recreated scene images
 */

import { v4 as uuidv4 } from 'uuid';
import { database, STORES } from './db.js';
import { getNextSceneOrder } from './utils.js';
import { deleteGCSAssets } from 'services/backend.js';
import { getSceneClips } from './clip.js';
    


// ==================== SCENES TABLE OPERATIONS ====================

/**
 * Create scene records for a project
 */
export async function createScenes(projectId, scenesData) {
    const tx = await database.transaction([STORES.SCENES], 'readwrite');
    const store = tx.objectStore(STORES.SCENES);

    const scenes = scenesData.map((sceneData) => ({
        id: uuidv4(), // Generate UUID for scene ID
        project_id: projectId,
        scene_order: sceneData.scene_order,
        is_selected: sceneData.is_selected || false,
        selected_image_id: sceneData.selected_image_id || null,
        selected_generated_image_id: sceneData.selected_generated_image_id || null,
        selected_clip_id: sceneData.selected_clip_id || null,
        settings: sceneData.settings || {},
        created_at: new Date().toISOString(),
    }));

    return new Promise((resolve, reject) => {
        const results = [];
        let completed = 0;

        scenes.forEach((scene) => {
            const request = store.add(scene);
            request.onsuccess = () => {
                results.push(scene); // Scene already has UUID, no need to add request.result
                completed++;
                if (completed === scenes.length) {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });

        if (scenes.length === 0) {
            resolve([]);
        }
    });
}

/**
 * Get scenes for a project
 */
export async function getScenesByProject(projectId) {
    const tx = await database.transaction([STORES.SCENES]);
    const store = tx.objectStore(STORES.SCENES);
    const index = store.index('project_id');

    return new Promise((resolve, reject) => {
        const request = index.getAll(projectId);
        request.onsuccess = () => {
            // Sort by scene_order
            const scenes = request.result.sort((a, b) => a.scene_order - b.scene_order);
            resolve(scenes);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update scene fields (is_selected, selected_image_id, etc.)
 */
export async function updateScene(sceneId, updates) {
    const tx = await database.transaction([STORES.SCENES], 'readwrite');
    const store = tx.objectStore(STORES.SCENES);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(sceneId);
        getRequest.onsuccess = () => {
            const scene = getRequest.result;
            if (!scene) {
                reject(new Error('Scene not found'));
                return;
            }

            // Update fields
            Object.assign(scene, updates);

            const putRequest = store.put(scene);
            putRequest.onsuccess = () => resolve(scene);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * Create a single scene with auto-calculated ordering
 * @param {string} projectId - Parent project ID
 * @param {Object|null} beforeScene - Scene to insert after (null for first scene)
 * @param {Object|null} afterScene - Scene to insert before (null for append)
 * @param {Object} metadata - Scene metadata and settings
 * @param {string|null} referenceImageUrl - Optional reference image URL
 * @returns {Promise<Object>} Created scene object
 */
export async function createScene(projectId, beforeScene, afterScene, metadata = {}, referenceImageUrl = null) {
    try {
        // Calculate the scene order using utility function
        const sceneOrder = getNextSceneOrder(beforeScene, afterScene);
        
        // Create the scene record
        const tx = await database.transaction([STORES.SCENES, STORES.SCENE_IMAGES], 'readwrite');
        const scenesStore = tx.objectStore(STORES.SCENES);
        const sceneImagesStore = tx.objectStore(STORES.SCENE_IMAGES);
        
        const sceneId = uuidv4();
        const scene = {
            id: sceneId,
            project_id: projectId,
            scene_order: sceneOrder,
            title: metadata.title,
            is_selected: metadata.isSelected || false,
            selected_image_id: null, // Will be set if referenceImageUrl is provided
            selected_generated_image_id: null,
            selected_clip_id: null,
            settings: metadata.settings || {},
            created_at: new Date().toISOString(),
        };

        // Add the scene
        await new Promise((resolve, reject) => {
            const request = scenesStore.add(scene);
            request.onsuccess = () => resolve(scene);
            request.onerror = () => reject(request.error);
        });

        // If reference image URL is provided, create a scene image
        if (referenceImageUrl) {
            const sceneImage = {
                scene_id: sceneId,
                gcs_url: referenceImageUrl,
                image_order: 0, // First image in the scene
                created_at: new Date().toISOString(),
            };

            const sceneImageResult = await new Promise((resolve, reject) => {
                const request = sceneImagesStore.add(sceneImage);
                request.onsuccess = () => resolve({ ...sceneImage, id: request.result });
                request.onerror = () => reject(request.error);
            });

            // Update the scene to select this reference image
            scene.selected_image_id = sceneImageResult.id;
            await new Promise((resolve, reject) => {
                const request = scenesStore.put(scene);
                request.onsuccess = () => resolve(scene);
                request.onerror = () => reject(request.error);
            });
        }

        return scene;
        
    } catch (error) {
        console.error('Error creating scene:', error);
        throw new Error(`Failed to create scene: ${error.message}`);
    }
}

/**
 * Delete a scene and all its related data (scene images, generated images, clips)
 * @param {string} sceneId - The scene ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteScene(sceneId) {
    try {
        // Step 1: Get the scene to validate it exists
        const tx1 = await database.transaction([STORES.SCENES], 'readonly');
        const scenesStore = tx1.objectStore(STORES.SCENES);
        
        const scene = await new Promise((resolve, reject) => {
            const request = scenesStore.get(sceneId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!scene) {
            console.log(`Scene ${sceneId} not found - silent pass`);
            return true;
        }

        // Step 2: Collect all GCS URLs that need to be deleted
        const gcsUrls = [];
        
        // Get scene images (using local function)
        const sceneImages = await getSceneImages(sceneId);
        sceneImages.forEach(sceneImage => {
            if (sceneImage.gcs_url) {
                gcsUrls.push(sceneImage.gcs_url);
            }
        });
        
        // Get recreated scene images (using local function)
        const recreatedImages = await getRecreatedSceneImages(sceneId);
        recreatedImages.forEach(recreatedImage => {
            if (recreatedImage.gcs_urls && Array.isArray(recreatedImage.gcs_urls)) {
                gcsUrls.push(...recreatedImage.gcs_urls);
            }
        });
        
        // Get scene clips (using dynamic import)
        const sceneClips = await getSceneClips(sceneId);
        sceneClips.forEach(clip => {
            if (clip.gcs_url) {
                gcsUrls.push(clip.gcs_url);
            }
        });

        // Step 3: Delete from GCS storage if there are any URLs
        if (gcsUrls.length > 0) {
            console.log(`Deleting ${gcsUrls.length} GCS files for scene ${sceneId}`);
            
            try {
                await deleteGCSAssets(gcsUrls);
                console.log(`Successfully deleted GCS files for scene ${sceneId}`);
            } catch (error) {
                // Strict error handling - if GCS deletion fails, halt the process
                console.error(`GCS deletion failed for scene ${sceneId}:`, error);
                throw new Error(`Failed to delete GCS files: ${error.message}`);
            }
        }

        // Step 4: Delete from IndexedDB (only if GCS deletion succeeded)
        // Delete in proper order: child records first, then parent records
        
        const stores = [STORES.SCENE_CLIPS, STORES.RECREATED_SCENE_IMAGES, STORES.SCENE_IMAGES, STORES.SCENES];
        const tx2 = await database.transaction(stores, 'readwrite');
        
        // Delete scene clips
        const sceneClipsStore = tx2.objectStore(STORES.SCENE_CLIPS);
        const sceneClipsIndex = sceneClipsStore.index('scene_id');
        const sceneClipsRequest = sceneClipsIndex.getAll(sceneId);
        await new Promise((resolve, reject) => {
            sceneClipsRequest.onsuccess = () => {
                const clips = sceneClipsRequest.result;
                let deletedCount = 0;
                if (clips.length === 0) {
                    resolve();
                    return;
                }
                clips.forEach(clip => {
                    const deleteRequest = sceneClipsStore.delete(clip.id);
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === clips.length) resolve();
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };
            sceneClipsRequest.onerror = () => reject(sceneClipsRequest.error);
        });
        
        // Delete recreated scene images
        const recreatedImagesStore = tx2.objectStore(STORES.RECREATED_SCENE_IMAGES);
        const recreatedImagesIndex = recreatedImagesStore.index('scene_id');
        const recreatedImagesRequest = recreatedImagesIndex.getAll(sceneId);
        await new Promise((resolve, reject) => {
            recreatedImagesRequest.onsuccess = () => {
                const images = recreatedImagesRequest.result;
                let deletedCount = 0;
                if (images.length === 0) {
                    resolve();
                    return;
                }
                images.forEach(image => {
                    const deleteRequest = recreatedImagesStore.delete(image.id);
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === images.length) resolve();
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };
            recreatedImagesRequest.onerror = () => reject(recreatedImagesRequest.error);
        });
        
        // Delete scene images
        const sceneImagesStore = tx2.objectStore(STORES.SCENE_IMAGES);
        const sceneImagesIndex = sceneImagesStore.index('scene_id');
        const sceneImagesRequest = sceneImagesIndex.getAll(sceneId);
        await new Promise((resolve, reject) => {
            sceneImagesRequest.onsuccess = () => {
                const images = sceneImagesRequest.result;
                let deletedCount = 0;
                if (images.length === 0) {
                    resolve();
                    return;
                }
                images.forEach(image => {
                    const deleteRequest = sceneImagesStore.delete(image.id);
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === images.length) resolve();
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };
            sceneImagesRequest.onerror = () => reject(sceneImagesRequest.error);
        });
        
        // Delete scene
        const scenesStoreDelete = tx2.objectStore(STORES.SCENES);
        await new Promise((resolve, reject) => {
            const deleteRequest = scenesStoreDelete.delete(sceneId);
            deleteRequest.onsuccess = () => {
                console.log(`Successfully deleted scene ${sceneId}`);
                resolve();
            };
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
        
        return true;
        
    } catch (error) {
        console.error('Error during scene deletion:', error);
        throw new Error(`Failed to delete scene: ${error.message}`);
    }
}

// ==================== SCENE_IMAGES TABLE OPERATIONS ====================

/**
 * Create scene image records
 */
export async function createSceneImages(sceneImagesData) {
    const tx = await database.transaction([STORES.SCENE_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.SCENE_IMAGES);

    const images = sceneImagesData.map((imageData) => ({
        scene_id: imageData.scene_id,
        gcs_url: imageData.gcs_url,
        image_order: imageData.image_order,
        created_at: new Date().toISOString(),
    }));

    return new Promise((resolve, reject) => {
        const results = [];
        let completed = 0;

        images.forEach((image) => {
            const request = store.add(image);
            request.onsuccess = () => {
                results.push({ ...image, id: request.result });
                completed++;
                if (completed === images.length) {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });

        if (images.length === 0) {
            resolve([]);
        }
    });
}

/**
 * Get scene images for a scene
 */
export async function getSceneImages(sceneId) {
    const tx = await database.transaction([STORES.SCENE_IMAGES]);
    const store = tx.objectStore(STORES.SCENE_IMAGES);
    const index = store.index('scene_id');

    return new Promise((resolve, reject) => {
        const request = index.getAll(sceneId);
        request.onsuccess = () => {
            // Sort by image_order
            const images = request.result.sort((a, b) => a.image_order - b.image_order);
            resolve(images);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all scene images for a project (with scene info)
 */
export async function getProjectSceneImages(projectId) {
    const scenes = await getScenesByProject(projectId);
    const sceneImages = {};

    for (const scene of scenes) {
        const images = await getSceneImages(scene.id);
        sceneImages[scene.id] = {
            scene,
            images,
        };
    }

    return sceneImages;
}

/**
 * Delete a scene image and update scene selection if necessary
 * @param {string} imageId - The scene image ID to delete
 * @returns {Promise<{success: boolean, wasSelected: boolean, sceneId: string}>} Result object
 */
export async function deleteSceneImage(imageId) {
    try {
        // Step 1: Get the scene image to validate it exists and get GCS URL
        const tx1 = await database.transaction([STORES.SCENE_IMAGES, STORES.SCENES], 'readonly');
        const sceneImagesStore = tx1.objectStore(STORES.SCENE_IMAGES);
        const scenesStore = tx1.objectStore(STORES.SCENES);
        
        const sceneImage = await new Promise((resolve, reject) => {
            const request = sceneImagesStore.get(imageId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!sceneImage) {
            throw new Error('Scene image not found');
        }

        // Step 2: Get the scene to check if this image is currently selected
        const scene = await new Promise((resolve, reject) => {
            const request = scenesStore.get(sceneImage.scene_id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!scene) {
            throw new Error('Scene not found');
        }

        const isSelectedImage = scene.selected_image_id === imageId;

        // Step 3: Delete from GCS storage if URL exists
        if (sceneImage.gcs_url) {
            try {
                await deleteGCSAssets([sceneImage.gcs_url]);
                console.log(`Successfully deleted GCS file for scene image ${imageId}`);
            } catch (error) {
                // Strict error handling - if GCS deletion fails, halt the process
                console.error(`GCS deletion failed for scene image ${imageId}:`, error);
                throw new Error(`Failed to delete GCS file: ${error.message}`);
            }
        }

        // Step 4: Delete from IndexedDB and update scene selection if necessary
        const tx2 = await database.transaction([STORES.SCENE_IMAGES, STORES.SCENES], 'readwrite');
        const sceneImagesStore2 = tx2.objectStore(STORES.SCENE_IMAGES);
        const scenesStore2 = tx2.objectStore(STORES.SCENES);

        // Delete the scene image
        await new Promise((resolve, reject) => {
            const deleteRequest = sceneImagesStore2.delete(imageId);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });

        // If this was the selected image, clear the scene's selection
        if (isSelectedImage) {
            scene.selected_image_id = null;
            await new Promise((resolve, reject) => {
                const putRequest = scenesStore2.put(scene);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            });
        }

        console.log(`Successfully deleted scene image ${imageId}`);
        return {
            success: true,
            wasSelected: isSelectedImage,
            sceneId: sceneImage.scene_id
        };
        
    } catch (error) {
        console.error('Error during scene image deletion:', error);
        throw new Error(`Failed to delete scene image: ${error.message}`);
    }
}

// ==================== RECREATED_SCENE_IMAGES TABLE OPERATIONS ====================

/**
 * Get recreated scene images for a scene
 */
export async function getRecreatedSceneImages(sceneId) {
    const tx = await database.transaction([STORES.RECREATED_SCENE_IMAGES]);
    const store = tx.objectStore(STORES.RECREATED_SCENE_IMAGES);
    const index = store.index('scene_id');

    return new Promise((resolve, reject) => {
        const request = index.getAll(sceneId);
        request.onsuccess = () => {
            // Sort by created_at descending (newest first)
            const images = request.result.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            resolve(images);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Add a recreated scene image (supports multiple URLs from single generation)
 */
export async function addRecreatedSceneImage(sceneId, gcsUrls, generationSources) {
    const tx = await database.transaction([STORES.RECREATED_SCENE_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.RECREATED_SCENE_IMAGES);

    // Handle both single URL (backward compatibility) and multiple URLs
    const urlsArray = Array.isArray(gcsUrls) ? gcsUrls : [gcsUrls];

    const recreatedImage = {
        scene_id: sceneId,
        gcs_urls: urlsArray,
        selected_image_idx: 0, // Default to first image
        generation_sources: generationSources || null,
        created_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
        const request = store.add(recreatedImage);
        request.onsuccess = () => {
            resolve({ ...recreatedImage, id: request.result });
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update selected image index for a recreated scene image
 */
export async function updateRecreatedSceneImageSelection(imageId, selectedIndex) {
    const tx = await database.transaction([STORES.RECREATED_SCENE_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.RECREATED_SCENE_IMAGES);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(imageId);
        getRequest.onsuccess = () => {
            const image = getRequest.result;
            if (!image) {
                reject(new Error('Recreated scene image not found'));
                return;
            }

            // Validate index is within bounds
            if (selectedIndex < 0 || selectedIndex >= image.gcs_urls.length) {
                reject(new Error('Selected image index out of bounds'));
                return;
            }

            image.selected_image_idx = selectedIndex;

            const putRequest = store.put(image);
            putRequest.onsuccess = () => resolve(image);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * Update scene orders for multiple scenes in a single transaction
 * @param {Array} sceneUpdates - Array of {id, scene_order} objects
 * @returns {Promise<boolean>} Success status
 */
export async function updateMultipleSceneOrders(sceneUpdates) {
    const tx = await database.transaction([STORES.SCENES], 'readwrite');
    const store = tx.objectStore(STORES.SCENES);

    return new Promise((resolve, reject) => {
        let completed = 0;
        const errors = [];

        if (sceneUpdates.length === 0) {
            resolve(true);
            return;
        }

        sceneUpdates.forEach(({ id, scene_order }) => {
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const scene = getRequest.result;
                if (!scene) {
                    errors.push(new Error(`Scene with id ${id} not found`));
                    completed++;
                    if (completed === sceneUpdates.length) {
                        errors.length > 0 ? reject(errors[0]) : resolve(true);
                    }
                    return;
                }
                
                scene.scene_order = scene_order;
                const putRequest = store.put(scene);
                
                putRequest.onsuccess = () => {
                    completed++;
                    if (completed === sceneUpdates.length) {
                        errors.length > 0 ? reject(errors[0]) : resolve(true);
                    }
                };
                
                putRequest.onerror = () => {
                    errors.push(putRequest.error);
                    completed++;
                    if (completed === sceneUpdates.length) {
                        reject(errors[0]);
                    }
                };
            };
            
            getRequest.onerror = () => {
                errors.push(getRequest.error);
                completed++;
                if (completed === sceneUpdates.length) {
                    reject(errors[0]);
                }
            };
        });
    });
}
