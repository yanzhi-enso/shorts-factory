/**
 * Project-related database operations
 * Handles project CRUD operations and complex project creation workflows
 */

import { database, STORES } from './db.js';
import { createScenes, createSceneImages, getScenesByProject, getSceneImages, getRecreatedSceneImages } from './scene.js';
import { getElementImages } from './elementImages.js';
import { getSceneClips } from './clip.js';
import { parseSceneFromUrl } from './utils.js';

// ==================== PROJECTS TABLE OPERATIONS ====================

/**
 * Create a new project record
 */
export async function createProject(projectData) {
    const tx = await database.transaction([STORES.PROJECTS], 'readwrite');
    const store = tx.objectStore(STORES.PROJECTS);

    const project = {
        id: projectData.id,
        tiktok_url: projectData.tiktok_url,
        name: projectData.name || null,
        story_description: projectData.story_description || null,
        story_global_changes: projectData.story_global_changes || null,
        settings: projectData.settings || {},
        stage: projectData.stage || 'scenes', // Default to scenes stage
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
        const request = store.add(project);
        request.onsuccess = () => resolve(project);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get project by ID
 */
export async function getProject(projectId) {
    const tx = await database.transaction([STORES.PROJECTS]);
    const store = tx.objectStore(STORES.PROJECTS);

    return new Promise((resolve, reject) => {
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all projects (for listing)
 */
export async function getAllProjects() {
    const tx = await database.transaction([STORES.PROJECTS]);
    const store = tx.objectStore(STORES.PROJECTS);
    const index = store.index('created_at');

    return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
            // Sort by created_at descending (newest first)
            const projects = request.result.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            resolve(projects);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update project
 */
export async function updateProject(projectId, updates) {
    const tx = await database.transaction([STORES.PROJECTS], 'readwrite');
    const store = tx.objectStore(STORES.PROJECTS);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(projectId);
        getRequest.onsuccess = () => {
            const project = getRequest.result;
            if (!project) {
                reject(new Error('Project not found'));
                return;
            }

            // Update fields
            Object.assign(project, updates, {
                modified_at: new Date().toISOString(),
            });

            const putRequest = store.put(project);
            putRequest.onsuccess = () => resolve(project);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

// ==================== COMPLEX PROJECT OPERATIONS ====================

/**
 * Create complete project structure from GCS file list
 */
export async function createProjectFromGCS(projectId, tiktokUrl, gcsUrls) {
    // 1. Create project record
    const project = await createProject({
        id: projectId,
        tiktok_url: tiktokUrl,
    });

    // 2. Parse and group images by scene
    const sceneGroups = {};
    gcsUrls.forEach((url) => {
        const parsed = parseSceneFromUrl(url);
        if (parsed) {
            const { sceneNumber, imageOrder } = parsed;
            if (!sceneGroups[sceneNumber]) {
                sceneGroups[sceneNumber] = [];
            }
            sceneGroups[sceneNumber].push({ url, imageOrder });
        }
    });

    // 3. Create scene records (default all scenes as selected)
    const scenesData = Object.keys(sceneGroups).map((sceneNumber) => ({
        scene_order: parseInt(sceneNumber, 10) * 100, // Gap-based ordering
        is_selected: true, // Default all scenes as selected
        selected_image_id: null,
    }));

    const scenes = await createScenes(projectId, scenesData);

    // 4. Create scene image records
    const sceneImagesData = [];
    scenes.forEach((scene, index) => {
        const sceneNumber = Object.keys(sceneGroups)[index];
        const images = sceneGroups[sceneNumber];

        images.forEach(({ url, imageOrder }) => {
            sceneImagesData.push({
                scene_id: scene.id,
                gcs_url: url,
                image_order: imageOrder,
            });
        });
    });

    const sceneImages = await createSceneImages(sceneImagesData);

    return {
        project,
        scenes,
        sceneImages,
    };
}

/**
 * Delete a project and all its related data (scenes, images, clips)
 * Also deletes associated GCS assets
 */
export async function deleteProject(projectId) {
    // Import backend service for GCS deletion
    const { deleteGCSAssets } = await import('../services/backend.js');
    
    try {
        // Step 1: Get all project-related data
        const project = await getProject(projectId);
        if (!project) {
            console.log(`Project ${projectId} not found - silent pass`);
            return true;
        }

        const scenes = await getScenesByProject(projectId);
        const elementImages = await getElementImages(projectId);
        
        // Collect all GCS URLs that need to be deleted
        const gcsUrls = [];
        
        // Step 2: Collect GCS URLs from all related data
        // Element images
        elementImages.forEach(elementImage => {
            if (elementImage.gcs_urls && Array.isArray(elementImage.gcs_urls)) {
                gcsUrls.push(...elementImage.gcs_urls);
            }
        });
        
        // Scene images and clips for each scene
        for (const scene of scenes) {
            // Original scene images
            const sceneImages = await getSceneImages(scene.id);
            sceneImages.forEach(sceneImage => {
                if (sceneImage.gcs_url) {
                    gcsUrls.push(sceneImage.gcs_url);
                }
            });
            
            // Recreated scene images
            const recreatedImages = await getRecreatedSceneImages(scene.id);
            recreatedImages.forEach(recreatedImage => {
                if (recreatedImage.gcs_urls && Array.isArray(recreatedImage.gcs_urls)) {
                    gcsUrls.push(...recreatedImage.gcs_urls);
                }
            });
            
            // Scene clips
            const sceneClips = await getSceneClips(scene.id);
            sceneClips.forEach(clip => {
                if (clip.gcs_url) {
                    gcsUrls.push(clip.gcs_url);
                }
            });
        }
        
        // Step 3: Delete from GCS storage if there are any URLs
        if (gcsUrls.length > 0) {
            console.log(`Deleting ${gcsUrls.length} GCS files for project ${projectId}`);
            
            try {
                await deleteGCSAssets(gcsUrls);
                console.log(`Successfully deleted GCS files for project ${projectId}`);
            } catch (error) {
                // Strict error handling - if GCS deletion fails, halt the process
                console.error(`GCS deletion failed for project ${projectId}:`, error);
                throw new Error(`Failed to delete GCS files: ${error.message}`);
            }
        }
        
        // Step 4: Delete from IndexedDB (only if GCS deletion succeeded)
        // Delete in proper order: child records first, then parent records
        
        const stores = [STORES.SCENE_CLIPS, STORES.RECREATED_SCENE_IMAGES, STORES.SCENE_IMAGES, 
                       STORES.ELEMENT_IMAGES, STORES.SCENES, STORES.PROJECTS];
        
        const tx = await database.transaction(stores, 'readwrite');
        
        // Delete scene clips
        const sceneClipsStore = tx.objectStore(STORES.SCENE_CLIPS);
        const sceneClipsIndex = sceneClipsStore.index('scene_id');
        for (const scene of scenes) {
            const sceneClipsRequest = sceneClipsIndex.getAll(scene.id);
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
        }
        
        // Delete recreated scene images
        const recreatedImagesStore = tx.objectStore(STORES.RECREATED_SCENE_IMAGES);
        const recreatedImagesIndex = recreatedImagesStore.index('scene_id');
        for (const scene of scenes) {
            const recreatedImagesRequest = recreatedImagesIndex.getAll(scene.id);
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
        }
        
        // Delete scene images
        const sceneImagesStore = tx.objectStore(STORES.SCENE_IMAGES);
        const sceneImagesIndex = sceneImagesStore.index('scene_id');
        for (const scene of scenes) {
            const sceneImagesRequest = sceneImagesIndex.getAll(scene.id);
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
        }
        
        // Delete element images
        const elementImagesStore = tx.objectStore(STORES.ELEMENT_IMAGES);
        const elementImagesIndex = elementImagesStore.index('project_id');
        const elementImagesRequest = elementImagesIndex.getAll(projectId);
        await new Promise((resolve, reject) => {
            elementImagesRequest.onsuccess = () => {
                const images = elementImagesRequest.result;
                let deletedCount = 0;
                if (images.length === 0) {
                    resolve();
                    return;
                }
                images.forEach(image => {
                    const deleteRequest = elementImagesStore.delete(image.id);
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === images.length) resolve();
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };
            elementImagesRequest.onerror = () => reject(elementImagesRequest.error);
        });
        
        // Delete scenes
        const scenesStore = tx.objectStore(STORES.SCENES);
        const scenesIndex = scenesStore.index('project_id');
        const scenesRequest = scenesIndex.getAll(projectId);
        await new Promise((resolve, reject) => {
            scenesRequest.onsuccess = () => {
                const sceneRecords = scenesRequest.result;
                let deletedCount = 0;
                if (sceneRecords.length === 0) {
                    resolve();
                    return;
                }
                sceneRecords.forEach(scene => {
                    const deleteRequest = scenesStore.delete(scene.id);
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === sceneRecords.length) resolve();
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };
            scenesRequest.onerror = () => reject(scenesRequest.error);
        });
        
        // Delete project
        const projectsStore = tx.objectStore(STORES.PROJECTS);
        await new Promise((resolve, reject) => {
            const deleteRequest = projectsStore.delete(projectId);
            deleteRequest.onsuccess = () => {
                console.log(`Successfully deleted project ${projectId}`);
                resolve();
            };
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
        
        return true;
        
    } catch (error) {
        console.error('Error during project deletion:', error);
        throw new Error(`Failed to delete project: ${error.message}`);
    }
}
