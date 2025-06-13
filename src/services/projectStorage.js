/**
 * Browser-based persistent storage using IndexedDB
 * Implements PROJECTS, SCENES, SCENE_IMAGES tables as defined in database design
 */

const DB_NAME = 'shorts-factory-db';
const DB_VERSION = 1;

// Table names
const STORES = {
  PROJECTS: 'projects',
  SCENES: 'scenes',
  SCENE_IMAGES: 'scene_images'
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

        // Create PROJECTS table
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('created_at', 'created_at');
          projectStore.createIndex('tiktok_url', 'tiktok_url');
        }

        // Create SCENES table
        if (!db.objectStoreNames.contains(STORES.SCENES)) {
          const sceneStore = db.createObjectStore(STORES.SCENES, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          sceneStore.createIndex('project_id', 'project_id');
          sceneStore.createIndex('scene_order', 'scene_order');
        }

        // Create SCENE_IMAGES table
        if (!db.objectStoreNames.contains(STORES.SCENE_IMAGES)) {
          const imageStore = db.createObjectStore(STORES.SCENE_IMAGES, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          imageStore.createIndex('scene_id', 'scene_id');
          imageStore.createIndex('image_order', 'image_order');
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
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
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
        const projects = request.result.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
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
          modified_at: new Date().toISOString()
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

    const scenes = scenesData.map(sceneData => ({
      project_id: projectId,
      scene_order: sceneData.scene_order,
      is_selected: sceneData.is_selected || false,
      selected_image_id: sceneData.selected_image_id || null,
      settings: sceneData.settings || {},
      created_at: new Date().toISOString()
    }));

    return new Promise((resolve, reject) => {
      const results = [];
      let completed = 0;

      scenes.forEach(scene => {
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

  // ==================== SCENE_IMAGES TABLE OPERATIONS ====================

  /**
   * Create scene image records
   */
  async createSceneImages(sceneImagesData) {
    const tx = await this.transaction([STORES.SCENE_IMAGES], 'readwrite');
    const store = tx.objectStore(STORES.SCENE_IMAGES);

    const images = sceneImagesData.map(imageData => ({
      scene_id: imageData.scene_id,
      gcs_url: imageData.gcs_url,
      image_order: imageData.image_order,
      created_at: new Date().toISOString()
    }));

    return new Promise((resolve, reject) => {
      const results = [];
      let completed = 0;

      images.forEach(image => {
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
        images
      };
    }

    return sceneImages;
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
        imageOrder: parseInt(match[2], 10)
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
      tiktok_url: tiktokUrl
    });

    // 2. Parse and group images by scene
    const sceneGroups = {};
    gcsUrls.forEach(url => {
      const parsed = ProjectStorage.parseSceneFromUrl(url);
      if (parsed) {
        const { sceneNumber, imageOrder } = parsed;
        if (!sceneGroups[sceneNumber]) {
          sceneGroups[sceneNumber] = [];
        }
        sceneGroups[sceneNumber].push({ url, imageOrder });
      }
    });

    // 3. Create scene records
    const scenesData = Object.keys(sceneGroups).map(sceneNumber => ({
      scene_order: parseInt(sceneNumber, 10) * 100, // Gap-based ordering
      is_selected: false,
      selected_image_id: null
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
          image_order: imageOrder
        });
      });
    });

    const sceneImages = await this.createSceneImages(sceneImagesData);

    return {
      project,
      scenes,
      sceneImages
    };
  }
}

// Export singleton instance
const projectStorage = new ProjectStorage();
export default projectStorage;
