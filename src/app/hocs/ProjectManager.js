'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import projectStorage from 'services/projectStorage';
import { validateProjectExists, isStageAdvancement } from 'utils/projectValidation';

// Initial state for the project manager
const initialState = {
    curProjId: null,
    currentProject: null,    // Full project object from storage
    scenes: [],              // Scene objects with proper structure
    elementImages: [],       // Element images for current project (project-level resources)
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
    UPDATE_SCENE_IMAGE_SELECTION: 'UPDATE_SCENE_IMAGE_SELECTION',
    ADD_GENERATED_IMAGE_SUCCESS: 'ADD_GENERATED_IMAGE_SUCCESS',
    UPDATE_GENERATED_IMAGE_SELECTION: 'UPDATE_GENERATED_IMAGE_SELECTION',
    ADD_GENERATED_CLIP_SUCCESS: 'ADD_GENERATED_CLIP_SUCCESS',
    UPDATE_GENERATED_CLIP_SELECTION: 'UPDATE_GENERATED_CLIP_SELECTION',
    ADD_ELEMENT_IMAGE_SUCCESS: 'ADD_ELEMENT_IMAGE_SUCCESS',
    REMOVE_ELEMENT_IMAGE_SUCCESS: 'REMOVE_ELEMENT_IMAGE_SUCCESS',
    UPDATE_PROJECT_STAGE: 'UPDATE_PROJECT_STAGE'
};

/**
 * ENRICHED SCENE STRUCTURE DOCUMENTATION
 * 
 * The ProjectManager transforms raw database scenes into enriched scenes for easier consumption by UI components.
 * This hides database schema complexity and provides a more product-logic focused data structure.
 * 
 * Raw DB Structure (from projectStorage):
 * - scenes: Array of scene objects with selected_image_id and selected_generated_image_id (foreign key references)
 * - sceneImages: Separate array of all scene images across all scenes
 * - recreatedSceneImages: Separate array of all generated images across all scenes
 * - elementImages: Separate array of all element images for the project (project-level resources)
 * 
 * Enriched Structure (provided by ProjectManager):
 * {
 *   id: number,                    // Scene ID
 *   projectId: string,             // Parent project ID
 *   sceneOrder: number,            // Ordering for display (gap-based: 100, 200, 300...)
 *   isSelected: boolean,           // Whether user selected this scene for processing
 *   selectedImage: string|null,    // URL of selected original image (transformed from selected_image_id)
 *   selectedImageId: number|null,  // Selected original image ID (DB storage reference)
 *   sceneImages: Array[{           // All original images belonging to this scene
 *     id: number,                  // Image ID
 *     sceneId: number,             // Parent scene ID
 *     gcsUrl: string,              // Image URL
 *     imageOrder: number,          // Order within scene
 *     createdAt: string            // Creation timestamp
 *   }],
 *   generatedImages: Array[{       // All generated images for this scene
 *     id: number,                  // Generated image ID
 *     sceneId: number,             // Parent scene ID
 *     gcsUrl: string,              // Generated image URL
 *     generationSources: object|null, // Sources used for generation
 *     createdAt: string            // Creation timestamp
 *   }],
 *   selectedGeneratedImage: string|null,    // URL of selected generated image
 *   selectedGeneratedImageId: number|null,  // Selected generated image ID (DB storage reference)
 *   sceneClips: Array[{            // All generated clips for this scene
 *     id: number,                  // Generated clip ID
 *     sceneId: number,             // Parent scene ID
 *     gcsUrl: string,              // Generated clip URL
 *     generationSources: object|null, // Sources used for generation
 *     createdAt: string            // Creation timestamp
 *   }],
 *   selectedSceneClip: string|null,         // URL of selected generated clip
 *   selectedSceneClipId: number|null,       // Selected generated clip ID (DB storage reference)
 *   settings: object,              // Scene-specific configuration
 *   createdAt: string              // Scene creation timestamp
 * }
 * 
 * Project-Level Element Images (separate from scenes):
 * elementImages: Array[{          // All element images for the project (shared resources)
 *   id: number,                   // Element image ID
 *   projectId: string,            // Parent project ID
 *   gcsUrl: string,               // Element image URL
 *   generationSources: object|null, // Sources used for generation (null for uploaded images)
 *   name: string|null,            // Optional user-defined name
 *   description: string|null,     // Optional description
 *   tags: string|null,            // Optional tags for organization
 *   createdAt: string             // Creation timestamp
 * }]
 * 
 * Key Transformations:
 * 1. selected_image_id → selectedImage (ID reference → actual URL string)
 * 2. selected_generated_image_id → selectedGeneratedImage (ID reference → actual URL string)
 * 3. Separate sceneImages array → embedded sceneImages per scene
 * 4. Separate recreatedSceneImages array → embedded generatedImages per scene
 * 5. Separate elementImages array → project-level elementImages (not scene-specific)
 * 6. All internal JS properties use camelCase, DB persistence still uses snake_case
 */

/**
 * Private helper to enrich raw scenes with embedded scene images, generated images, scene clips, and resolved selected URLs
 * Transforms snake_case DB properties to camelCase for internal JavaScript use
 */
const enrichScenes = async (rawScenes, sceneImagesMap) => {
    const enrichedScenes = [];
    
    for (const scene of rawScenes) {
        const rawSceneImages = sceneImagesMap[scene.id] || [];
        const selectedImageId = scene.selected_image_id || rawSceneImages[0]?.id || null;
        const selectedImage = selectedImageId 
            ? rawSceneImages.find(img => img.id === selectedImageId)?.gcs_url || null
            : null;
        
        // Transform scene images to camelCase
        const sceneImages = rawSceneImages.map(img => ({
            id: img.id,
            sceneId: img.scene_id,
            gcsUrl: img.gcs_url,
            imageOrder: img.image_order,
            createdAt: img.created_at
        }));
        
        // Load generated images for this scene
        const rawGeneratedImages = await projectStorage.getRecreatedSceneImages(scene.id);
        
        // Transform generated images to camelCase
        const generatedImages = rawGeneratedImages.map(img => ({
            id: img.id,
            sceneId: img.scene_id,
            gcsUrl: img.gcs_url,
            generationSources: img.generation_sources,
            createdAt: img.created_at
        }));
        
        // Determine selected generated image (fallback to most recent if selectedGeneratedImageId is null)
        const selectedGeneratedImageId = scene.selected_generated_image_id || 
                                       (generatedImages.length > 0 ? generatedImages[0].id : null);
        const selectedGeneratedImage = selectedGeneratedImageId 
            ? generatedImages.find(img => img.id === selectedGeneratedImageId)?.gcsUrl || null
            : null;
        
        // Load generated clips for this scene
        const rawSceneClips = await projectStorage.getSceneClips(scene.id);
        
        // Transform scene clips to camelCase
        const sceneClips = rawSceneClips.map(clip => ({
            id: clip.id,
            sceneId: clip.scene_id,
            gcsUrl: clip.gcs_url,
            generationSources: clip.generation_sources,
            createdAt: clip.created_at
        }));
        
        // Determine selected scene clip (fallback to most recent if selectedSceneClipId is null)
        const selectedSceneClipId = scene.selected_clip_id || 
                                  (sceneClips.length > 0 ? sceneClips[0].id : null);
        const selectedSceneClip = selectedSceneClipId 
            ? sceneClips.find(clip => clip.id === selectedSceneClipId)?.gcsUrl || null
            : null;
        
        // Transform scene properties to camelCase and add all fields
        enrichedScenes.push({
            id: scene.id,
            projectId: scene.project_id,
            sceneOrder: scene.scene_order,
            isSelected: scene.is_selected,
            selectedImage: selectedImage,
            selectedImageId: selectedImageId,
            sceneImages: sceneImages,
            generatedImages: generatedImages,
            selectedGeneratedImage: selectedGeneratedImage,
            selectedGeneratedImageId: selectedGeneratedImageId,
            sceneClips: sceneClips,
            selectedSceneClip: selectedSceneClip,
            selectedSceneClipId: selectedSceneClipId,
            settings: scene.settings,
            createdAt: scene.created_at
        });
    }
    
    return enrichedScenes;
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
                elementImages: action.payload.elementImages || [],
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
                        ? { ...scene, isSelected: action.payload.isSelected }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.UPDATE_SCENE_IMAGE_SELECTION:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { ...scene, selectedImage: action.payload.imageUrl }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.ADD_GENERATED_IMAGE_SUCCESS:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { 
                            ...scene, 
                            generatedImages: [action.payload.generatedImage, ...scene.generatedImages],
                            selectedGeneratedImage: action.payload.generatedImage.gcsUrl,
                            selectedGeneratedImageId: action.payload.generatedImage.id
                          }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.UPDATE_GENERATED_IMAGE_SELECTION:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { 
                            ...scene, 
                            selectedGeneratedImage: action.payload.imageUrl,
                            selectedGeneratedImageId: action.payload.imageId
                          }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.ADD_GENERATED_CLIP_SUCCESS:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { 
                            ...scene, 
                            sceneClips: [action.payload.generatedClip, ...scene.sceneClips],
                            selectedSceneClip: action.payload.generatedClip.gcsUrl,
                            selectedSceneClipId: action.payload.generatedClip.id
                          }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.UPDATE_GENERATED_CLIP_SELECTION:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { 
                            ...scene, 
                            selectedSceneClip: action.payload.clipUrl,
                            selectedSceneClipId: action.payload.clipId
                          }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.ADD_ELEMENT_IMAGE_SUCCESS:
            return {
                ...state,
                elementImages: [action.payload.elementImage, ...state.elementImages]
            };
        
        case PROJECT_ACTIONS.REMOVE_ELEMENT_IMAGE_SUCCESS:
            return {
                ...state,
                elementImages: state.elementImages.filter(img => img.id !== action.payload.elementImageId)
            };
        
        case PROJECT_ACTIONS.UPDATE_PROJECT_STAGE:
            return {
                ...state,
                currentProject: {
                    ...state.currentProject,
                    stage: action.payload.stage
                }
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
            const enrichedScenes = await enrichScenes(projectData.scenes, sceneImagesMap);
            
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
            const enrichedScenes = await enrichScenes(scenes, sceneImagesMap);

            // Load element images for the project
            const rawElementImages = await projectStorage.getElementImages(projectId);
            
            // Transform element images to camelCase
            const elementImages = rawElementImages.map(img => ({
                id: img.id,
                projectId: img.project_id,
                gcsUrl: img.gcs_url,
                generationSources: img.generation_sources,
                name: img.name,
                description: img.description,
                tags: img.tags,
                createdAt: img.created_at
            }));

            dispatch({ 
                type: PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS, 
                payload: {
                    project,
                    scenes: enrichedScenes,
                    elementImages
                }
            });

            return { 
                success: true, 
                shouldRedirect: false,
                project,
                scenes: enrichedScenes,
                elementImages
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
            const enrichedScenes = await enrichScenes(scenes, sceneImagesMap);

            // Load element images for the project
            const rawElementImages = await projectStorage.getElementImages(projectId);
            
            // Transform element images to camelCase
            const elementImages = rawElementImages.map(img => ({
                id: img.id,
                projectId: img.project_id,
                gcsUrl: img.gcs_url,
                generationSources: img.generation_sources,
                name: img.name,
                description: img.description,
                tags: img.tags,
                createdAt: img.created_at
            }));

            dispatch({ 
                type: PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS, 
                payload: {
                    project,
                    scenes: enrichedScenes,
                    elementImages
                }
            });

            return { success: true, project, scenes: enrichedScenes, elementImages };
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
            
            // Update in local state (uses selectedImage URL)
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_SCENE_IMAGE_SELECTION, 
                payload: { sceneId, imageUrl: image.gcsUrl } 
            });
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update selected image';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Add a new generated image to a scene and set it as selected
     */
    const addGeneratedImage = async (sceneId, gcsUrl, generationSources) => {
        try {
            // Add to persistent storage (returns raw DB object)
            const rawGeneratedImage = await projectStorage.addRecreatedSceneImage(
                sceneId, gcsUrl, generationSources
            );
            
            // Update scene to select this new image
            await projectStorage.updateScene(sceneId, { 
                selected_generated_image_id: rawGeneratedImage.id 
            });
            
            // Transform to JavaScript format for state
            const generatedImage = {
                id: rawGeneratedImage.id,
                sceneId: rawGeneratedImage.scene_id,
                gcsUrl: rawGeneratedImage.gcs_url,
                generationSources: rawGeneratedImage.generation_sources,
                createdAt: rawGeneratedImage.created_at
            };
            
            // Update local state
            dispatch({ 
                type: PROJECT_ACTIONS.ADD_GENERATED_IMAGE_SUCCESS, 
                payload: { sceneId, generatedImage } 
            });
            
            return { success: true, generatedImage };
        } catch (err) {
            const errorMessage = err.message || 'Failed to add generated image';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Update selected generated image for a scene with persistent storage
     */
    const updateSelectedGeneratedImage = async (sceneId, generatedImageId) => {
        try {
            // Find the generated image to get its URL
            const scene = projectState.scenes.find(s => s.id === sceneId);
            const generatedImage = scene?.generatedImages.find(img => img.id === generatedImageId);
            
            if (!generatedImage) {
                throw new Error('Generated image not found');
            }
            
            // Update in persistent storage
            await projectStorage.updateScene(sceneId, { 
                selected_generated_image_id: generatedImageId 
            });
            
            // Update in local state
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_GENERATED_IMAGE_SELECTION, 
                payload: { 
                    sceneId, 
                    imageId: generatedImageId,
                    imageUrl: generatedImage.gcsUrl 
                } 
            });
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update selected generated image';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Update project settings (including story configuration)
     */
    const updateProjectSettings = async (settings) => {
        try {
            // Update current project settings
            const updatedProject = {
                ...projectState.currentProject,
                settings: {
                    ...projectState.currentProject?.settings,
                    ...settings
                }
            };
            
            // Update in persistent storage
            await projectStorage.updateProject(projectState.curProjId, { settings: updatedProject.settings });
            
            // Update in local state
            dispatch({ 
                type: PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS, 
                payload: {
                    project: updatedProject,
                    scenes: projectState.scenes
                }
            });
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update project settings';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Add a new generated clip to a scene and set it as selected
     */
    const addGeneratedClip = async (sceneId, gcsUrl, generationSources) => {
        try {
            // Add to persistent storage (returns raw DB object)
            const rawSceneClip = await projectStorage.addSceneClip(
                sceneId, gcsUrl, generationSources
            );
            
            // Update scene to select this new clip
            await projectStorage.updateScene(sceneId, { 
                selected_clip_id: rawSceneClip.id 
            });
            
            // Transform to JavaScript format for state
            const generatedClip = {
                id: rawSceneClip.id,
                sceneId: rawSceneClip.scene_id,
                gcsUrl: rawSceneClip.gcs_url,
                generationSources: rawSceneClip.generation_sources,
                createdAt: rawSceneClip.created_at
            };
            
            // Update local state
            dispatch({ 
                type: PROJECT_ACTIONS.ADD_GENERATED_CLIP_SUCCESS, 
                payload: { sceneId, generatedClip } 
            });
            
            return { success: true, generatedClip };
        } catch (err) {
            const errorMessage = err.message || 'Failed to add generated clip';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Get generated clips for a scene (sorted by -created_at)
     */
    const getGeneratedClips = (sceneId) => {
        const scene = projectState.scenes.find(s => s.id === sceneId);
        return scene?.sceneClips || [];
    };

    /**
     * Update selected generated clip for a scene with persistent storage
     */
    const updateSelectedGeneratedClip = async (sceneClipId) => {
        try {
            // Find the scene that contains this clip
            const scene = projectState.scenes.find(s => 
                s.sceneClips.some(clip => clip.id === sceneClipId)
            );
            
            if (!scene) {
                throw new Error('Scene not found for clip');
            }
            
            // Find the clip to get its URL
            const sceneClip = scene.sceneClips.find(clip => clip.id === sceneClipId);
            
            if (!sceneClip) {
                throw new Error('Scene clip not found');
            }
            
            // Update in persistent storage
            await projectStorage.updateScene(scene.id, { 
                selected_clip_id: sceneClipId 
            });
            
            // Update in local state
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_GENERATED_CLIP_SELECTION, 
                payload: { 
                    sceneId: scene.id, 
                    clipId: sceneClipId,
                    clipUrl: sceneClip.gcsUrl 
                } 
            });
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update selected generated clip';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Update project stage with progression validation
     * Only updates if new stage is more advanced than current stage
     */
    const updateStage = async (newStage) => {
        try {
            const currentStage = projectState.currentProject?.stage || 'scenes';
            
            // Use utility function for stage comparison
            if (isStageAdvancement(currentStage, newStage)) {
                // Update in persistent storage
                await projectStorage.updateProject(projectState.curProjId, { stage: newStage });
                
                // Update in local state
                dispatch({ 
                    type: PROJECT_ACTIONS.UPDATE_PROJECT_STAGE, 
                    payload: { stage: newStage } 
                });
                
                return { success: true, updated: true };
            }
            
            return { success: true, updated: false }; // No update needed
        } catch (err) {
            const errorMessage = err.message || 'Failed to update project stage';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Convert WebP image to PNG using Canvas API
     */
    const convertWebPToPNG = async (webpFile) => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Create a new File object with PNG type
                        const pngFile = new File([blob], webpFile.name.replace(/\.webp$/i, '.png'), {
                            type: 'image/png',
                            lastModified: Date.now()
                        });
                        resolve(pngFile);
                    } else {
                        reject(new Error('Failed to convert WebP to PNG'));
                    }
                }, 'image/png', 1.0); // Maximum quality
            };
            
            img.onerror = () => reject(new Error('Failed to load WebP image'));
            img.src = URL.createObjectURL(webpFile);
        });
    };

    /**
     * Handle image upload with file validation, WebP conversion, and GCS upload
     */
    const handleImageUpload = async (sceneId, imageFile) => {
        try {
            // 1. Validate file size (< 25MB)
            const maxSize = 25 * 1024 * 1024; // 25MB in bytes
            if (imageFile.size > maxSize) {
                alert('File size must be less than 25MB');
                return { success: false, error: 'File size exceeds 25MB limit' };
            }

            // 2. Handle WebP conversion to PNG if needed
            let processedFile = imageFile;
            if (imageFile.type === 'image/webp') {
                try {
                    processedFile = await convertWebPToPNG(imageFile);
                } catch (conversionError) {
                    console.error('WebP conversion failed:', conversionError);
                    return { success: false, error: 'Failed to convert WebP image' };
                }
            }

            // 3. Request signed URL from backend
            const signedUrlResponse = await fetch('/api/upload/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectState.curProjId })
            });

            if (!signedUrlResponse.ok) {
                throw new Error('Failed to get signed URL');
            }

            const { signed_url, public_url, image_id } = await signedUrlResponse.json();

            // 4. Upload file directly to GCS using signed URL
            const uploadResponse = await fetch(signed_url, {
                method: 'PUT',
                body: processedFile,
                headers: {
                    'Content-Type': 'image/png'
                }
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload image to storage');
            }

            // 5. Store public URL in IndexedDB (no generation sources for uploaded images)
            const result = await addGeneratedImage(sceneId, public_url, null);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            return { success: true, imageId: image_id, publicUrl: public_url };

        } catch (error) {
            console.error('Image upload failed:', error);
            alert(`Image upload failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    };

    /**
     * Add a new element image to the project
     */
    const addElementImage = async (gcsUrl, generationSources = null, name = null, description = null, tags = null) => {
        try {
            // Add to persistent storage (returns raw DB object)
            const rawElementImage = await projectStorage.addElementImage(
                projectState.curProjId, gcsUrl, generationSources, name, description, tags
            );
            
            // Transform to JavaScript format for state
            const elementImage = {
                id: rawElementImage.id,
                projectId: rawElementImage.project_id,
                gcsUrl: rawElementImage.gcs_url,
                generationSources: rawElementImage.generation_sources,
                name: rawElementImage.name,
                description: rawElementImage.description,
                tags: rawElementImage.tags,
                createdAt: rawElementImage.created_at
            };
            
            // Update local state
            dispatch({ 
                type: PROJECT_ACTIONS.ADD_ELEMENT_IMAGE_SUCCESS, 
                payload: { elementImage } 
            });
            
            return { success: true, elementImage };
        } catch (err) {
            const errorMessage = err.message || 'Failed to add element image';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Remove an element image from the project
     */
    const removeElementImage = async (elementImageId) => {
        try {
            // Remove from persistent storage
            await projectStorage.removeElementImage(elementImageId);
            
            // Update local state
            dispatch({ 
                type: PROJECT_ACTIONS.REMOVE_ELEMENT_IMAGE_SUCCESS, 
                payload: { elementImageId } 
            });
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.message || 'Failed to remove element image';
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
        updateSelectedImage,
        addGeneratedImage,
        updateSelectedGeneratedImage,
        addGeneratedClip,
        getGeneratedClips,
        updateSelectedGeneratedClip,
        updateProjectSettings,
        updateStage,
        handleImageUpload,
        addElementImage,
        removeElementImage
    };
    
    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// Export the context as well for advanced use cases
export { ProjectContext, PROJECT_ACTIONS };
