/**
 * Browser-based persistent storage using IndexedDB
 * Implements PROJECTS, SCENES, SCENE_IMAGES tables as defined in database design
 */

const DB_NAME = 'shorts-factory-db';
const DB_VERSION = 4;

// Table names
const STORES = {
    PROJECTS: 'projects',
    SCENES: 'scenes',
    SCENE_IMAGES: 'scene_images',
    RECREATED_SCENE_IMAGES: 'recreated_scene_images',
    SCENE_CLIPS: 'scene_clips',
    ELEMENT_IMAGES: 'element_images',
};

class ProjectStorage {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize IndexedDB connection
     */
    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;
                const oldVersion = event.oldVersion;

                // Create PROJECTS table
                if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
                    const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
                    projectStore.createIndex('created_at', 'created_at');
                    projectStore.createIndex('tiktok_url', 'tiktok_url');
                }

                // Create or migrate SCENES table
                if (!db.objectStoreNames.contains(STORES.SCENES)) {
                    // Fresh installation - create new SCENES table with all fields
                    const sceneStore = db.createObjectStore(STORES.SCENES, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    sceneStore.createIndex('project_id', 'project_id');
                    sceneStore.createIndex('scene_order', 'scene_order');
                }
                // Note: For existing v1 installations, we handle the missing selected_generated_image_id
                // field gracefully in the application code (it will be undefined/null)

                // Create SCENE_IMAGES table
                if (!db.objectStoreNames.contains(STORES.SCENE_IMAGES)) {
                    const imageStore = db.createObjectStore(STORES.SCENE_IMAGES, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    imageStore.createIndex('scene_id', 'scene_id');
                    imageStore.createIndex('image_order', 'image_order');
                }

                // Create RECREATED_SCENE_IMAGES table (version 2+)
                if (
                    oldVersion < 2 &&
                    !db.objectStoreNames.contains(STORES.RECREATED_SCENE_IMAGES)
                ) {
                    const recreatedImageStore = db.createObjectStore(
                        STORES.RECREATED_SCENE_IMAGES,
                        {
                            keyPath: 'id',
                            autoIncrement: true,
                        }
                    );
                    recreatedImageStore.createIndex('scene_id', 'scene_id');
                }

                // Create SCENE_CLIPS table (version 3+)
                if (oldVersion < 3) {
                    // Create SCENE_CLIPS table
                    if (!db.objectStoreNames.contains(STORES.SCENE_CLIPS)) {
                        const sceneClipsStore = db.createObjectStore(STORES.SCENE_CLIPS, {
                            keyPath: 'id',
                            autoIncrement: true,
                        });
                        sceneClipsStore.createIndex('scene_id', 'scene_id');
                    }
                }

                // Create ELEMENT_IMAGES table (version 4+)
                if (oldVersion < 4) {
                    // Create ELEMENT_IMAGES table
                    if (!db.objectStoreNames.contains(STORES.ELEMENT_IMAGES)) {
                        const elementImagesStore = db.createObjectStore(STORES.ELEMENT_IMAGES, {
                            keyPath: 'id',
                            autoIncrement: true,
                        });
                        elementImagesStore.createIndex('project_id', 'project_id');
                        elementImagesStore.createIndex('created_at', 'created_at');
                    }
                }
            };
        });
    }

    /**
     * Generic transaction helper
     */
    async transaction(storeNames, mode = 'readonly') {
        await this.init();
        return this.db.transaction(storeNames, mode);
    }

    // ==================== PROJECTS TABLE OPERATIONS ====================

    /**
     * Create a new project record
     */
    async createProject(projectData) {
        const tx = await this.transaction([STORES.PROJECTS], 'readwrite');
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
    async getProject(projectId) {
        const tx = await this.transaction([STORES.PROJECTS]);
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
    async getAllProjects() {
        const tx = await this.transaction([STORES.PROJECTS]);
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
    async updateProject(projectId, updates) {
        const tx = await this.transaction([STORES.PROJECTS], 'readwrite');
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

    // ==================== SCENES TABLE OPERATIONS ====================

    /**
     * Create scene records for a project
     */
    async createScenes(projectId, scenesData) {
        const tx = await this.transaction([STORES.SCENES], 'readwrite');
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
    async getScenesByProject(projectId) {
        const tx = await this.transaction([STORES.SCENES]);
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
    async updateScene(sceneId, updates) {
        const tx = await this.transaction([STORES.SCENES], 'readwrite');
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
    async createSceneImages(sceneImagesData) {
        const tx = await this.transaction([STORES.SCENE_IMAGES], 'readwrite');
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
    async getSceneImages(sceneId) {
        const tx = await this.transaction([STORES.SCENE_IMAGES]);
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
    async getProjectSceneImages(projectId) {
        const scenes = await this.getScenesByProject(projectId);
        const sceneImages = {};

        for (const scene of scenes) {
            const images = await this.getSceneImages(scene.id);
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
    async getRecreatedSceneImages(sceneId) {
        const tx = await this.transaction([STORES.RECREATED_SCENE_IMAGES]);
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
     * Add a recreated scene image
     */
    async addRecreatedSceneImage(sceneId, gcsUrl, generationSources) {
        const tx = await this.transaction([STORES.RECREATED_SCENE_IMAGES], 'readwrite');
        const store = tx.objectStore(STORES.RECREATED_SCENE_IMAGES);

        const recreatedImage = {
            scene_id: sceneId,
            gcs_url: gcsUrl,
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

    // ==================== SCENE_CLIPS TABLE OPERATIONS ====================

    /**
     * Get scene clips for a scene
     */
    async getSceneClips(sceneId) {
        const tx = await this.transaction([STORES.SCENE_CLIPS]);
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
    async addSceneClip(sceneId, gcsUrl, generationSources) {
        const tx = await this.transaction([STORES.SCENE_CLIPS], 'readwrite');
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

    // ==================== ELEMENT_IMAGES TABLE OPERATIONS ====================

    /**
     * Add an element image to a project
     */
    async addElementImage(projectId, gcsUrl, generationSources = null, name = null, description = null, tags = null) {
        const tx = await this.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
        const store = tx.objectStore(STORES.ELEMENT_IMAGES);

        const elementImage = {
            project_id: projectId,
            gcs_url: gcsUrl,
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
     * Remove an element image by ID
     */
    async removeElementImage(elementImageId) {
        const tx = await this.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
        const store = tx.objectStore(STORES.ELEMENT_IMAGES);

        return new Promise((resolve, reject) => {
            const request = store.delete(elementImageId);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get element images for a project
     */
    async getElementImages(projectId) {
        const tx = await this.transaction([STORES.ELEMENT_IMAGES]);
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
    async updateElementImage(elementImageId, updates) {
        const tx = await this.transaction([STORES.ELEMENT_IMAGES], 'readwrite');
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

    // ==================== UTILITY METHODS ====================

    /**
     * Parse scene information from GCS URL
     * Example: "https://storage.googleapis.com/.../project_id/video-Scene-1-1.jpg"
     * Returns: { sceneNumber: 1, imageOrder: 1 }
     */
    static parseSceneFromUrl(gcsUrl) {
        const match = gcsUrl.match(/video-Scene-(\d+)-(\d+)\./);
        if (match) {
            return {
                sceneNumber: parseInt(match[1], 10),
                imageOrder: parseInt(match[2], 10),
            };
        }
        return null;
    }

    /**
     * Create complete project structure from GCS file list
     */
    async createProjectFromGCS(projectId, tiktokUrl, gcsUrls) {
        // 1. Create project record
        const project = await this.createProject({
            id: projectId,
            tiktok_url: tiktokUrl,
        });

        // 2. Parse and group images by scene
        const sceneGroups = {};
        gcsUrls.forEach((url) => {
            const parsed = ProjectStorage.parseSceneFromUrl(url);
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

        const scenes = await this.createScenes(projectId, scenesData);

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

        const sceneImages = await this.createSceneImages(sceneImagesData);

        return {
            project,
            scenes,
            sceneImages,
        };
    }
}

// Export singleton instance
const projectStorage = new ProjectStorage();
export default projectStorage;
