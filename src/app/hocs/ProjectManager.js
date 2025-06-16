'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import projectStorage from 'services/projectStorage';
import { validateProjectExists } from 'utils/projectValidation';

// Initial state for the project manager
const initialState = {
    curProjId: null,
    currentProject: null,    // Full project object from storage
    scenes: [],              // Scene objects with proper structure  
    loading: false,
    error: null
};

// Action types
const PROJECT_ACTIONS = {
    CREATE_PROJECT_START: 'CREATE_PROJECT_START',
    CREATE_PROJECT_SUCCESS: 'CREATE_PROJECT_SUCCESS',
    CREATE_PROJECT_ERROR: 'CREATE_PROJECT_ERROR',
    LOAD_PROJECT_SUCCESS: 'LOAD_PROJECT_SUCCESS',
    RESET_PROJECT: 'RESET_PROJECT',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    UPDATE_SCENE_SELECTION: 'UPDATE_SCENE_SELECTION',
    UPDATE_SCENE_IMAGE_SELECTION: 'UPDATE_SCENE_IMAGE_SELECTION'
};

/**
 * ENRICHED SCENE STRUCTURE DOCUMENTATION
 * 
 * The ProjectManager transforms raw database scenes into enriched scenes for easier consumption by UI components.
 * This hides database schema complexity and provides a more product-logic focused data structure.
 * 
 * Raw DB Structure (from projectStorage):
 * - scenes: Array of scene objects with selected_image_id (foreign key reference)
 * - sceneImages: Separate array of all scene images across all scenes
 * 
 * Enriched Structure (provided by ProjectManager):
 * {
 *   id: number,                    // Scene ID
 *   project_id: string,            // Parent project ID
 *   scene_order: number,           // Ordering for display (gap-based: 100, 200, 300...)
 *   is_selected: boolean,          // Whether user selected this scene for processing
 *   selected_image: string|null,   // URL of selected image (transformed from selected_image_id)
 *   selected_image_id: number|null // Selected image ID (DB storage, not used in UI)
 *   sceneImages: Array[{           // All images belonging to this scene
 *     id: number,                  // Image ID
 *     scene_id: number,            // Parent scene ID
 *     gcs_url: string,             // Image URL
 *     image_order: number,         // Order within scene
 *     created_at: string           // Creation timestamp
 *   }],
 *   settings: object,              // Scene-specific configuration
 *   created_at: string             // Scene creation timestamp
 * }
 * 
 * Key Transformations:
 * 1. selected_image_id → selected_image (ID reference → actual URL string)
 * 2. Separate sceneImages array → embedded sceneImages per scene
 * 3. DB persistence still uses selected_image_id internally
 */

/**
 * Private helper to enrich raw scenes with embedded scene images and resolved selected image URL
 */
const enrichScenes = (rawScenes, sceneImagesMap) => {
    return rawScenes.map(scene => {
        const sceneImages = sceneImagesMap[scene.id] || [];
        scene.selected_image_id = scene.selected_image_id || sceneImages[0]?.id || null;
        const selectedImage = scene.selected_image_id 
            ? sceneImages.find(img => img.id === scene.selected_image_id)?.gcs_url || null
            : null;
        
        return {
            ...scene,
            sceneImages,
            // note, in db, we store selected_image_id, 
            selected_image: selectedImage,
        };
    });
};

// Reducer function
function projectReducer(state, action) {
    switch (action.type) {
        case PROJECT_ACTIONS.CREATE_PROJECT_START:
            return {
                ...state,
                loading: true,
                error: null
            };
        
        case PROJECT_ACTIONS.CREATE_PROJECT_SUCCESS:
            return {
                ...state,
                loading: false,
                error: null,
                curProjId: action.payload.project.id,
                currentProject: action.payload.project,
                scenes: action.payload.scenes,
            };
        
        case PROJECT_ACTIONS.CREATE_PROJECT_ERROR:
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        
        case PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS:
            return {
                ...state,
                loading: false,
                error: null,
                curProjId: action.payload.project.id,
                currentProject: action.payload.project,
                scenes: action.payload.scenes,
            };
        
        case PROJECT_ACTIONS.RESET_PROJECT:
            return {
                ...initialState
            };
        
        case PROJECT_ACTIONS.SET_ERROR:
            return {
                ...state,
                error: action.payload
            };
        
        case PROJECT_ACTIONS.CLEAR_ERROR:
            return {
                ...state,
                error: null
            };
        
        case PROJECT_ACTIONS.UPDATE_SCENE_SELECTION:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { ...scene, is_selected: action.payload.isSelected }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.UPDATE_SCENE_IMAGE_SELECTION:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { ...scene, selected_image: action.payload.imageUrl }
                        : scene
                )
            };
        
        default:
            return state;
    }
}

// Create the context
const ProjectContext = createContext(undefined);

// Custom hook to use the project context
export function useProjectManager() {
    const context = useContext(ProjectContext);
    
    if (context === undefined) {
        throw new Error('useProjectManager must be used within a ProjectProvider');
    }
    
    return context;
}

// Provider component
export function ProjectProvider({ children }) {
    const [projectState, dispatch] = useReducer(projectReducer, initialState);
    
    /**
     * Create a new project from video URL
     */
    const createProject = async (videoUrl) => {
        if (!videoUrl) {
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: 'Please enter a video URL' });
            return { success: false, error: 'Please enter a video URL' };
        }

        dispatch({ type: PROJECT_ACTIONS.CREATE_PROJECT_START });

        try {
            // Call backend API to start processing
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_url: videoUrl })
            });

            if (!response.ok) {
                throw new Error('Failed to process video');
            }

            const data = await response.json();
            
            // Fetch file list via backend proxy to avoid CORS issues
            const fileListResponse = await fetch(`/api/files/${data.project_id}`);
            if (!fileListResponse.ok) {
                throw new Error('Failed to fetch file list');
            }
            
            const fileData = await fileListResponse.json();
            
            // Store project data in IndexedDB and get structured data
            const projectData = await projectStorage.createProjectFromGCS(
                data.project_id, 
                videoUrl, 
                fileData.files
            );
            
            console.log('Project stored successfully in IndexedDB:', data.project_id);
            
            // Organize scene images by scene ID for enrichment
            const sceneImagesMap = {};
            projectData.scenes.forEach(scene => {
                sceneImagesMap[scene.id] = projectData.sceneImages.filter(
                    img => img.scene_id === scene.id
                );
            });
            
            // Enrich scenes with embedded images and selected image URL
            const enrichedScenes = enrichScenes(projectData.scenes, sceneImagesMap);
            
            dispatch({ 
                type: PROJECT_ACTIONS.CREATE_PROJECT_SUCCESS, 
                payload: {
                    project: projectData.project,
                    scenes: enrichedScenes,
                }
            });
            
            return { 
                success: true, 
                projectId: data.project_id,
                project: projectData.project,
                scenes: enrichedScenes,
            };
            
        } catch (err) {
            const errorMessage = err.message || 'An error occurred';
            dispatch({ type: PROJECT_ACTIONS.CREATE_PROJECT_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Initialize project from URL parameters
     */
    const initializeFromUrl = useCallback(async (stage, projectId) => {
        if (!projectId) {
            return { success: true, shouldRedirect: false };
        }

        try {
            // Validate project exists
            const validation = await validateProjectExists(projectId);
            
            if (!validation.isValid) {
                dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: validation.error });
                return { 
                    success: false, 
                    error: validation.error,
                    shouldRedirect: true 
                };
            }

            // Load project from IndexedDB
            const project = await projectStorage.getProject(projectId);
            // [TODO] - handle case where project is not found in local storage
            // load the scene image and redirect user to scenes tab no matter what
            // stage the url is suggesting
            if (!project) {
                dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: 'Project not found in local storage' });
                return { 
                    success: false, 
                    error: 'Project not found in local storage',
                    shouldRedirect: true 
                };
            }

            // Load scenes and scene images
            const scenes = await projectStorage.getScenesByProject(projectId);
            const sceneImagesData = await projectStorage.getProjectSceneImages(projectId);
            
            // Organize scene images by scene ID
            const sceneImagesMap = {};
            Object.values(sceneImagesData).forEach(({ scene, images }) => {
                sceneImagesMap[scene.id] = images;
            });

            // Enrich scenes with embedded images and selected image URL
            const enrichedScenes = enrichScenes(scenes, sceneImagesMap);

            dispatch({ 
                type: PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS, 
                payload: {
                    project,
                    scenes: enrichedScenes
                }
            });

            return { 
                success: true, 
                shouldRedirect: false,
                project,
                scenes: enrichedScenes,
            };

        } catch (err) {
            const errorMessage = 'Failed to initialize project';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { 
                success: false, 
                error: errorMessage,
                shouldRedirect: true 
            };
        }
    }, []);

    /**
     * Reset project state
     */
    const resetProject = () => {
        dispatch({ type: PROJECT_ACTIONS.RESET_PROJECT });
    };

    /**
     * Load existing project by ID
     */
    const loadProject = async (projectId) => {
        try {
            const project = await projectStorage.getProject(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            const scenes = await projectStorage.getScenesByProject(projectId);
            const sceneImagesData = await projectStorage.getProjectSceneImages(projectId);
            
            // Organize scene images by scene ID
            const sceneImagesMap = {};
            Object.values(sceneImagesData).forEach(({ scene, images }) => {
                sceneImagesMap[scene.id] = images;
            });

            // Enrich scenes with embedded images and selected image URL
            const enrichedScenes = enrichScenes(scenes, sceneImagesMap);

            dispatch({ 
                type: PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS, 
                payload: {
                    project,
                    scenes: enrichedScenes,
                }
            });

            return { success: true, project, scenes: enrichedScenes };
        } catch (err) {
            const errorMessage = err.message || 'Failed to load project';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Get all stored projects for listing
     */
    const getAllProjects = async () => {
        try {
            const projects = await projectStorage.getAllProjects();
            return { success: true, projects };
        } catch (err) {
            const errorMessage = err.message || 'Failed to load projects';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Clear error state
     */
    const clearError = () => {
        dispatch({ type: PROJECT_ACTIONS.CLEAR_ERROR });
    };

    /**
     * Update scene selection status with persistent storage
     */
    const updateSceneSelection = async (sceneId, isSelected) => {
        try {
            // Update in persistent storage
            await projectStorage.updateScene(sceneId, { is_selected: isSelected });
            
            // Update in local state
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_SCENE_SELECTION, 
                payload: { sceneId, isSelected } 
            });
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update scene selection';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Update selected image for a scene with persistent storage
     */
    const updateSelectedImage = async (sceneId, image) => {
        try {
            // Update in persistent storage (still uses selected_image_id)
            // Note: in db, selected image is stored as selected_image_id
            // selectedImage is just a convenience for UI
            await projectStorage.updateScene(sceneId, { selected_image_id: image.id });
            
            // Update in local state (uses selected_image URL)
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_SCENE_IMAGE_SELECTION, 
                payload: { sceneId, imageUrl: image.gcs_url } 
            });
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update selected image';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    const value = {
        projectState,
        dispatch,
        // Methods
        createProject,
        initializeFromUrl,
        resetProject,
        loadProject,
        getAllProjects,
        clearError,
        updateSceneSelection,
        updateSelectedImage
    };
    
    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// Export the context as well for advanced use cases
export { ProjectContext, PROJECT_ACTIONS };
