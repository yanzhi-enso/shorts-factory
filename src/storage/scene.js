/**
 * Scene-related database operations
 * Handles scenes, scene images, recreated scene images, and element images
 */

import { database, STORES } from './db.js';

// ==================== SCENES TABLE OPERATIONS ====================

/**
 * Create scene records for a project
 */
export async function createScenes(projectId, scenesData) {
    const tx = await database.transaction([STORES.SCENES], 'readwrite');
    const store = tx.objectStore(STORES.SCENES);

    const scenes = scenesData.map((sceneData) => ({
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
                results.push({ ...scene, id: request.result });
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

// ==================== ELEMENT_IMAGES TABLE OPERATIONS ====================

/**
 * Add an element image to a project (supports multiple URLs from single generation)
 */
export async function addElementImage(projectId, gcsUrls, generationSources = null, name = null, description = null, tags = null) {
    const tx = await database.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.ELEMENT_IMAGES);

    // Handle both single URL (backward compatibility) and multiple URLs
    const urlsArray = Array.isArray(gcsUrls) ? gcsUrls : [gcsUrls];

    const elementImage = {
        project_id: projectId,
        gcs_urls: urlsArray,
        selected_image_idx: 0, // Default to first image
        generation_sources: generationSources || null,
        name: name || null,
        description: description || null,
        tags: tags || null,
        created_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
        const request = store.add(elementImage);
        request.onsuccess = () => {
            resolve({ ...elementImage, id: request.result });
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update selected image index for an element image
 */
export async function updateElementImageSelection(elementImageId, selectedIndex) {
    const tx = await database.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.ELEMENT_IMAGES);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(elementImageId);
        getRequest.onsuccess = () => {
            const elementImage = getRequest.result;
            if (!elementImage) {
                reject(new Error('Element image not found'));
                return;
            }

            // Validate index is within bounds
            if (selectedIndex < 0 || selectedIndex >= elementImage.gcs_urls.length) {
                reject(new Error('Selected image index out of bounds'));
                return;
            }

            elementImage.selected_image_idx = selectedIndex;

            const putRequest = store.put(elementImage);
            putRequest.onsuccess = () => resolve(elementImage);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * Remove an element image by ID (includes GCS deletion via backend)
 */
export async function removeElementImage(elementImageId) {
    // Import backend service for GCS deletion
    const { deleteGCSAssets } = await import('../services/backend.js');
    
    try {
        // Step 1: Get element image data using a separate transaction
        const elementImage = await new Promise(async (resolve, reject) => {
            const tx = await database.transaction([STORES.ELEMENT_IMAGES], 'readonly');
            const store = tx.objectStore(STORES.ELEMENT_IMAGES);
            const getRequest = store.get(elementImageId);
            
            getRequest.onsuccess = () => {
                resolve(getRequest.result);
            };
            getRequest.onerror = () => {
                reject(new Error(`Failed to retrieve element image: ${getRequest.error}`));
            };
        });

        if (!elementImage) {
            // Element image doesn't exist - silent pass
            console.log(`Element image ${elementImageId} not found in storage - silent pass`);
            return true;
        }

        // Step 2: Delete from GCS storage via backend
        if (elementImage.gcs_urls && elementImage.gcs_urls.length > 0) {
            console.log(`Deleting ${elementImage.gcs_urls.length} GCS files for element image ${elementImageId}`);
            
            try {
                await deleteGCSAssets(elementImage.gcs_urls);
                console.log(`Successfully deleted GCS files for element image ${elementImageId}`);
            } catch (error) {
                // Strict error handling - if GCS deletion fails, halt the process
                console.error(`GCS deletion failed for element image ${elementImageId}:`, error);
                throw new Error(`Failed to delete GCS files: ${error.message}`);
            }
        }

        // Step 3: Delete from IndexedDB using a new transaction (only if GCS deletion succeeded)
        await new Promise(async (resolve, reject) => {
            const tx = await database.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
            const store = tx.objectStore(STORES.ELEMENT_IMAGES);
            const deleteRequest = store.delete(elementImageId);
            
            deleteRequest.onsuccess = () => {
                console.log(`Successfully removed element image ${elementImageId}`);
                resolve(true);
            };
            deleteRequest.onerror = () => {
                reject(new Error(`Failed to remove element image from IndexedDB: ${deleteRequest.error}`));
            };
        });

        return true;
        
    } catch (error) {
        console.error('Error during element image removal:', error);
        throw new Error(`Failed to remove element image: ${error.message}`);
    }
}

/**
 * Get element images for a project
 */
export async function getElementImages(projectId) {
    const tx = await database.transaction([STORES.ELEMENT_IMAGES]);
    const store = tx.objectStore(STORES.ELEMENT_IMAGES);
    const index = store.index('project_id');

    return new Promise((resolve, reject) => {
        const request = index.getAll(projectId);
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
 * Update element image metadata (name, description, tags)
 */
export async function updateElementImage(elementImageId, updates) {
    const tx = await database.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.ELEMENT_IMAGES);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(elementImageId);
        getRequest.onsuccess = () => {
            const elementImage = getRequest.result;
            if (!elementImage) {
                reject(new Error('Element image not found'));
                return;
            }

            // Only update editable metadata fields
            const editableFields = ['name', 'description', 'tags'];
            const filteredUpdates = {};
            
            editableFields.forEach(field => {
                if (updates.hasOwnProperty(field)) {
                    filteredUpdates[field] = updates[field];
                }
            });

            // Apply updates to element image
            Object.assign(elementImage, filteredUpdates);

            const putRequest = store.put(elementImage);
            putRequest.onsuccess = () => resolve(elementImage);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}
