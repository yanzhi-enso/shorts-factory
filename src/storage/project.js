/**
 * Project-related database operations
 * Handles project CRUD operations and complex project creation workflows
 */

import { database, STORES } from './db.js';
import { createScenes, createSceneImages } from './scene.js';
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
