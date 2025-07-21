/**
 * Element Images database operations
 * Handles element images storage, retrieval, and management
 */

import { database, STORES } from './db.js';
import { deleteGCSAssets } from 'services/backend.js';

// ==================== ELEMENT_IMAGES TABLE OPERATIONS ====================

/**
 * Add an element image to a project (supports multiple URLs from single generation)
 */
export async function addElementImage(projectId, gcsUrls, generationSources = null, name = null, description = null, tags = null) {
    const tx = await database.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.ELEMENT_IMAGES);

    // Handle both single URL (backward compatibility) and multiple URLs
    if (!Array.isArray(gcsUrls)) {
        throw new Error('gcsUrls must be an array of URLs');
    }

    const elementImage = {
        project_id: projectId,
        gcs_urls: gcsUrls,
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
