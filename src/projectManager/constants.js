/**
 * Project Manager Constants
 * Initial state and action types for project management
 */

// Initial state for the project manager
export const initialState = {
    curProjId: null,
    currentProject: null,    // Full project object from storage
    scenes: [],              // Scene objects with proper structure
    elementImages: [],       // Element images for current project (project-level resources)
    loading: false,
    error: null
};

// Action types
export const PROJECT_ACTIONS = {
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
    UPDATE_ELEMENT_IMAGE_SUCCESS: 'UPDATE_ELEMENT_IMAGE_SUCCESS',
    UPDATE_PROJECT_STAGE: 'UPDATE_PROJECT_STAGE'
};
