/**
 * Database foundation for IndexedDB operations
 * Handles initialization, migrations, and provides shared database instance
 */

const DB_NAME = 'shorts-factory-db';
const DB_VERSION = 5;

// Table names
export const STORES = {
    PROJECTS: 'projects',
    SCENES: 'scenes',
    SCENE_IMAGES: 'scene_images',
    RECREATED_SCENE_IMAGES: 'recreated_scene_images',
    SCENE_CLIPS: 'scene_clips',
    ELEMENT_IMAGES: 'element_images',
};

class Database {
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

                // Migrate to multi-image structure (version 5+)
                if (oldVersion < 5) {
                    // Migrate RECREATED_SCENE_IMAGES: gcs_url -> gcs_urls + selected_image_idx
                    if (db.objectStoreNames.contains(STORES.RECREATED_SCENE_IMAGES)) {
                        const recreatedStore = transaction.objectStore(STORES.RECREATED_SCENE_IMAGES);
                        const recreatedRequest = recreatedStore.getAll();
                        
                        recreatedRequest.onsuccess = () => {
                            const records = recreatedRequest.result;
                            records.forEach(record => {
                                if (record.gcs_url && !record.gcs_urls) {
                                    // Convert single URL to array format
                                    record.gcs_urls = [record.gcs_url];
                                    record.selected_image_idx = 0;
                                    delete record.gcs_url;
                                    recreatedStore.put(record);
                                }
                            });
                        };
                    }

                    // Migrate ELEMENT_IMAGES: gcs_url -> gcs_urls + selected_image_idx
                    if (db.objectStoreNames.contains(STORES.ELEMENT_IMAGES)) {
                        const elementStore = transaction.objectStore(STORES.ELEMENT_IMAGES);
                        const elementRequest = elementStore.getAll();
                        
                        elementRequest.onsuccess = () => {
                            const records = elementRequest.result;
                            records.forEach(record => {
                                if (record.gcs_url && !record.gcs_urls) {
                                    // Convert single URL to array format
                                    record.gcs_urls = [record.gcs_url];
                                    record.selected_image_idx = 0;
                                    delete record.gcs_url;
                                    elementStore.put(record);
                                }
                            });
                        };
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
}

// Export singleton instance
export const database = new Database();
