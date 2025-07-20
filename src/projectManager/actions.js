/**
 * Project Manager Actions
 * 
 * IMPORTANT: All state-changing functions follow this pattern:
 * 1. Update persistent storage first
 * 2. Update local state second
 * 
 * This ensures data consistency and proper error handling.
 */

import { useCallback } from 'react';
import { 
    createProjectFromGCS, 
    getProject, 
    getAllProjects, 
    updateProject,
    deleteProject as deleteProjectStorage 
} from '../storage/project.js';
import { 
    getScenesByProject, 
    getProjectSceneImages, 
    getElementImages, 
    updateScene, 
    addRecreatedSceneImage, 
    addElementImage, 
    removeElementImage, 
    updateElementImage, 
    updateRecreatedSceneImageSelection, 
    updateElementImageSelection
} from '../storage/scene.js';
import { 
    addSceneClip 
} from '../storage/clip.js';
import { 
    validateProjectExists, isStageAdvancement
} from 'utils/client/projectValidation';
import { 
    uploadImage, IMAGE_TYPE_ELEMENT, IMAGE_TYPE_GENERATED_SCENE
} from 'utils/client/upload';
import { PROJECT_ACTIONS } from './constants';
import { 
    enrichScenes, 
    organizeSceneImagesBySceneId, 
    transformElementImageToJS,
    transformGeneratedImageToJS,
    transformSceneClipToJS
} from './parser';

/**
 * Creates all project action functions
 * @param {Function} dispatch - Redux dispatch function
 * @param {Object} projectState - Current project state
 * @returns {Object} Object containing all action functions
 */
export const createProjectActions = (dispatch, projectState) => {
    /**
     * Create a new project from video URL or with custom metadata
     */
    const createProject = async (videoUrl, projectMetadata = null) => {
        dispatch({ type: PROJECT_ACTIONS.CREATE_PROJECT_START });

        try {
            // Call backend API to start processing (handles both video and empty projects)
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_url: videoUrl || '' })
            });

            if (!response.ok) {
                throw new Error('Failed to create project');
            }

            const data = await response.json();
            
            let projectData;
            
            if (videoUrl) {
                // Existing video processing flow
                const fileListResponse = await fetch(`/api/files/${data.project_id}`);
                if (!fileListResponse.ok) {
                    throw new Error('Failed to fetch file list');
                }
                
                const fileData = await fileListResponse.json();
                
                // Store project data in IndexedDB and get structured data
                projectData = await createProjectFromGCS(
                    data.project_id, 
                    videoUrl, 
                    fileData.files
                );
                
                // Apply any additional metadata if provided
                if (projectMetadata) {
                    await updateProject(data.project_id, {
                        name: projectMetadata.name,
                        story_description: projectMetadata.storyDescription,
                        settings: projectMetadata.settings
                    });
                    
                    // Update the local project object
                    projectData.project = {
                        ...projectData.project,
                        name: projectMetadata.name,
                        story_description: projectMetadata.storyDescription,
                        settings: projectMetadata.settings
                    };
                }
                
                console.log('Video project stored successfully in IndexedDB:', data.project_id);
            } else {
                // Empty project flow - just create project record without scenes
                const { createProject: createProjectRecord } = await import('../storage/project.js');
                
                const project = await createProjectRecord({
                    id: data.project_id,
                    tiktok_url: null,
                    name: projectMetadata?.name || null,
                    story_description: projectMetadata?.storyDescription || null,
                    settings: projectMetadata?.settings || {}
                });
                
                projectData = {
                    project,
                    scenes: [],
                    sceneImages: []
                };
                
                console.log('Empty project stored successfully in IndexedDB:', data.project_id);
            }
            
            // Organize scene images by scene ID for enrichment (handles empty scenes array)
            const sceneImagesMap = organizeSceneImagesBySceneId(projectData.scenes, projectData.sceneImages);
            
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
            const project = await getProject(projectId);
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
            const scenes = await getScenesByProject(projectId);
            const sceneImagesData = await getProjectSceneImages(projectId);
            
            // Organize scene images by scene ID
            const sceneImagesMap = {};
            Object.values(sceneImagesData).forEach(({ scene, images }) => {
                sceneImagesMap[scene.id] = images;
            });

            // Enrich scenes with embedded images and selected image URL
            const enrichedScenes = await enrichScenes(scenes, sceneImagesMap);

            // Load element images for the project
            const rawElementImages = await getElementImages(projectId);
            
            // Transform element images to camelCase and handle multi-image structure
            const elementImages = rawElementImages.map(transformElementImageToJS);

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
            const project = await getProject(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            const scenes = await getScenesByProject(projectId);
            const sceneImagesData = await getProjectSceneImages(projectId);
            
            // Organize scene images by scene ID
            const sceneImagesMap = {};
            Object.values(sceneImagesData).forEach(({ scene, images }) => {
                sceneImagesMap[scene.id] = images;
            });

            // Enrich scenes with embedded images and selected image URL
            const enrichedScenes = await enrichScenes(scenes, sceneImagesMap);

            // Load element images for the project
            const rawElementImages = await getElementImages(projectId);
            
            // Transform element images to camelCase and handle multi-image structure
            const elementImages = rawElementImages.map(transformElementImageToJS);

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
    const getAllProjectsAction = async () => {
        try {
            const projects = await getAllProjects();
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
            // Update in persistent storage first
            await updateScene(sceneId, { is_selected: isSelected });
            
            // Update in local state second
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
            // Update in persistent storage first (still uses selected_image_id)
            // Note: in db, selected image is stored as selected_image_id
            // selectedImage is just a convenience for UI
            await updateScene(sceneId, { selected_image_id: image.id });
            
            // Update in local state second (uses selectedImage URL)
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
     * GeneratedImages only support gcs_urls (array format)
     */
    const addGeneratedImage = async (sceneId, gcsUrls, generationSources) => {
        try {
            // Add to persistent storage first (returns raw DB object)
            const rawGeneratedImage = await addRecreatedSceneImage(
                sceneId, gcsUrls, generationSources
            );
            
            // Update scene to select this new image
            await updateScene(sceneId, { 
                selected_generated_image_id: rawGeneratedImage.id 
            });
            
            // Transform to JavaScript format for state
            const generatedImage = transformGeneratedImageToJS(rawGeneratedImage);
            
            // Update local state second
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
            // Find the generated image to validate it exists
            const scene = projectState.scenes.find(s => s.id === sceneId);
            const generatedImage = scene?.generatedImages.find(img => img.id === generatedImageId);
            
            if (!generatedImage) {
                throw new Error('Generated image not found');
            }
            
            // Update in persistent storage first
            await updateScene(sceneId, { 
                selected_generated_image_id: generatedImageId 
            });
            
            // Update in local state second
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_GENERATED_IMAGE_SELECTION, 
                payload: { 
                    sceneId, 
                    imageId: generatedImageId
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
            
            // Update in persistent storage first
            await updateProject(projectState.curProjId, { settings: updatedProject.settings });
            
            // Update in local state second
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
            // Add to persistent storage first (returns raw DB object)
            const rawSceneClip = await addSceneClip(
                sceneId, gcsUrl, generationSources
            );
            
            // Update scene to select this new clip
            await updateScene(sceneId, { 
                selected_clip_id: rawSceneClip.id 
            });
            
            // Transform to JavaScript format for state
            const generatedClip = transformSceneClipToJS(rawSceneClip);
            
            // Update local state second
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
            
            // Update in persistent storage first
            await updateScene(scene.id, { 
                selected_clip_id: sceneClipId 
            });
            
            // Update in local state second
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
                // Update in persistent storage first
                await updateProject(projectState.curProjId, { stage: newStage });
                
                // Update in local state second
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
     * Handle scene image upload using centralized upload utility
     */
    const handleSceneImageUpload = async (sceneId, imageFile) => {
        try {
            // Use centralized upload utility
            const uploadResult = await uploadImage(
                imageFile, 
                IMAGE_TYPE_GENERATED_SCENE,
                projectState.curProjId
            );
            
            if (!uploadResult.success) {
                return uploadResult;
            }

            // Store in IndexedDB as generated scene image
            const result = await addGeneratedImage(sceneId, uploadResult.public_url, null);
            
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                imageId: uploadResult.image_id,
                publicUrl: uploadResult.public_url,
                generatedImage: result.generatedImage
            };

        } catch (error) {
            console.error('Scene image upload failed:', error);
            return { success: false, error: error.message };
        }
    };

    /**
     * Handle element image upload using centralized upload utility
     */
    const handleElementImageUpload = async (imageFile, metadata = {}) => {
        try {
            // Use centralized upload utility
            const uploadResult = await uploadImage(
                imageFile,
                IMAGE_TYPE_ELEMENT,
                projectState.curProjId
            );

            if (!uploadResult.success) {
                console.error('actions consider the upload failed', uploadResult.success);
                return uploadResult;
            }

            // Store in IndexedDB as element image
            const result = await addElementImageAction(
                [uploadResult.public_url],
                null, // generation sources
                metadata.name || null,
                metadata.description || null,
                metadata.tags || null
            );

            if (!result.success) {
                console.error('db saving failed', result);
                return result;
            }

            return {
                success: true,
                imageId: uploadResult.image_id,
                publicUrl: uploadResult.public_url,
                elementImage: result.elementImage,
            };
        } catch (error) {
            console.error('Element image upload failed:', error);
            return { success: false, error: error.message };
        }
    };

    /**
     * Add a new element image to the project
     */
    const addElementImageAction = async (
        gcsUrls, generationSources = null, name = null, description = null, tags = null
    ) => {
        try {
            // Add to persistent storage first (returns raw DB object)
            const rawElementImage = await addElementImage(
                projectState.curProjId, gcsUrls, generationSources, name, description, tags
            );
            
            // Transform to JavaScript format for state
            const elementImage = transformElementImageToJS(rawElementImage);
            
            // Update local state second
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
    const removeElementImageAction = async (elementImageId) => {
        try {
            // Remove from persistent storage first
            await removeElementImage(elementImageId);
            
            // Update local state second
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

    /**
     * Update element image metadata (name, description, tags)
     */
    const updateElementImageAction = async (elementImageId, updates) => {
        try {
            // Update in persistent storage first (returns raw DB object)
            const rawElementImage = await updateElementImage(elementImageId, updates);
            
            // Transform to JavaScript format for state
            const elementImage = transformElementImageToJS(rawElementImage);
            
            // Update local state second
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_ELEMENT_IMAGE_SUCCESS, 
                payload: { elementImage } 
            });
            
            return { success: true, elementImage };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update element image';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Update selected image index for a generated scene image
     */
    const updateGeneratedImageIndex = async (sceneId, generatedImageId, selectedIndex) => {
        try {
            // Update in persistent storage first
            const rawGeneratedImage = await updateRecreatedSceneImageSelection(generatedImageId, selectedIndex);
            
            // Transform to JavaScript format for state
            const updatedGeneratedImage = transformGeneratedImageToJS(rawGeneratedImage);
            
            // Update local state second
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_GENERATED_IMAGE_SELECTION, 
                payload: { 
                    sceneId, 
                    imageId: generatedImageId
                }
            });
            
            return { success: true, generatedImage: updatedGeneratedImage };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update generated image selection';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Update selected image index for an element image
     */
    const updateElementImageIndex = async (elementImageId, selectedIndex) => {
        try {
            // Update in persistent storage first
            const rawElementImage = await updateElementImageSelection(elementImageId, selectedIndex);
            
            // Transform to JavaScript format for state
            const updatedElementImage = transformElementImageToJS(rawElementImage);
            
            // Update local state second
            dispatch({ 
                type: PROJECT_ACTIONS.UPDATE_ELEMENT_IMAGE_SUCCESS, 
                payload: { elementImage: updatedElementImage } 
            });
            
            return { success: true, elementImage: updatedElementImage };
        } catch (err) {
            const errorMessage = err.message || 'Failed to update element image selection';
            dispatch({ type: PROJECT_ACTIONS.SET_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Delete a project and all its related data
     * Handles both local record deletion and GCS asset cleanup
     */
    const deleteProject = async (projectId) => {
        dispatch({ type: PROJECT_ACTIONS.DELETE_PROJECT_START });

        try {
            // Check if project has scenes (for folder deletion logic)
            const scenes = await getScenesByProject(projectId);
            const hasScenes = scenes && scenes.length > 0;
            
            // Delete from persistent storage first (includes GCS cleanup)
            await deleteProjectStorage(projectId);
            
            // Update local state second - no state update needed since this is for project listing
            dispatch({ 
                type: PROJECT_ACTIONS.DELETE_PROJECT_SUCCESS, 
                payload: { projectId, hasScenes } 
            });
            
            return { success: true, hasScenes };
        } catch (err) {
            const errorMessage = err.message || 'Failed to delete project';
            dispatch({ type: PROJECT_ACTIONS.DELETE_PROJECT_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    // Return all action functions
    return {
        createProject,
        initializeFromUrl,
        resetProject,
        loadProject,
        getAllProjects: getAllProjectsAction,
        clearError,
        updateSceneSelection,
        updateSelectedImage,
        addGeneratedImage,
        updateSelectedGeneratedImage,
        updateGeneratedImageIndex,
        addGeneratedClip,
        getGeneratedClips,
        updateSelectedGeneratedClip,
        updateProjectSettings,
        updateStage,
        handleSceneImageUpload,
        handleElementImageUpload,
        addElementImage: addElementImageAction,
        removeElementImage: removeElementImageAction,
        updateElementImage: updateElementImageAction,
        updateElementImageIndex,
        deleteProject
    };
};
