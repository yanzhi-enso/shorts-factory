'use client';

import React, { createContext, useContext, useReducer } from 'react';
import projectStorage from '../../services/projectStorage';
import { validateProjectExists } from '../../utils/projectValidation';

// Initial state for the project manager
const initialState = {
    curProjId: null,
    currentProject: null,    // Full project object from storage
    scenes: [],              // Scene objects with proper structure  
    sceneImages: {},         // Keyed by scene ID: { [sceneId]: images[] }
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
    CLEAR_ERROR: 'CLEAR_ERROR'
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
                sceneImages: action.payload.sceneImages
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
                sceneImages: action.payload.sceneImages
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
     * Replaces the old onProcessComplete logic from StartTab and TabManager
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
            
            // Organize scene images by scene ID for easy access
            const sceneImagesMap = {};
            projectData.scenes.forEach(scene => {
                sceneImagesMap[scene.id] = projectData.sceneImages.filter(
                    img => img.scene_id === scene.id
                );
            });
            
            dispatch({ 
                type: PROJECT_ACTIONS.CREATE_PROJECT_SUCCESS, 
                payload: {
                    project: projectData.project,
                    scenes: projectData.scenes,
                    sceneImages: sceneImagesMap
                }
            });
            
            return { 
                success: true, 
                projectId: data.project_id,
                project: projectData.project,
                scenes: projectData.scenes,
                sceneImages: sceneImagesMap
            };
            
        } catch (err) {
            const errorMessage = err.message || 'An error occurred';
            dispatch({ type: PROJECT_ACTIONS.CREATE_PROJECT_ERROR, payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Initialize project from URL parameters
     * Replaces the initializeFromUrl logic from TabManager
     */
    const initializeFromUrl = async (stage, projectId) => {
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

            dispatch({ 
                type: PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS, 
                payload: {
                    project,
                    scenes,
                    sceneImages: sceneImagesMap
                }
            });

            return { 
                success: true, 
                shouldRedirect: false,
                project,
                scenes,
                sceneImages: sceneImagesMap,
                // For backward compatibility with TabManager
                images: validation.files
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
    };

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

            dispatch({ 
                type: PROJECT_ACTIONS.LOAD_PROJECT_SUCCESS, 
                payload: {
                    project,
                    scenes,
                    sceneImages: sceneImagesMap
                }
            });

            return { success: true, project, scenes, sceneImages: sceneImagesMap };
        } catch (err) {
            const errorMessage = err.message || 'Failed to load project';
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

    const value = {
        projectState,
        dispatch,
        // Methods
        createProject,
        initializeFromUrl,
        resetProject,
        loadProject,
        clearError
    };
    
    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// Export the context as well for advanced use cases
export { ProjectContext, PROJECT_ACTIONS };
