/**
 * Project Manager Reducer
 * Pure reducer function - handles all state transformations without side effects
 */

import { PROJECT_ACTIONS, initialState } from './constants';

/**
 * Project reducer function
 * Handles all state updates for project management
 */
export function projectReducer(state, action) {
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
            console.log('Updating scene image selection for scene:', action.payload.sceneId);
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
        
        case PROJECT_ACTIONS.UPDATE_ELEMENT_IMAGE_SUCCESS:
            return {
                ...state,
                elementImages: state.elementImages.map(img => 
                    img.id === action.payload.elementImage.id 
                        ? action.payload.elementImage
                        : img
                )
            };
        
        case PROJECT_ACTIONS.UPDATE_PROJECT_STAGE:
            return {
                ...state,
                currentProject: {
                    ...state.currentProject,
                    stage: action.payload.stage
                }
            };
        
        case PROJECT_ACTIONS.ADD_SCENE_SUCCESS:
            // Insert scene in correct position based on sceneOrder
            const newScene = action.payload.scene;
            const updatedScenes = [...state.scenes, newScene].sort((a, b) => a.sceneOrder - b.sceneOrder);
            return {
                ...state,
                scenes: updatedScenes
            };
        
        case PROJECT_ACTIONS.REMOVE_SCENE_SUCCESS:
            return {
                ...state,
                scenes: state.scenes.filter(scene => scene.id !== action.payload.sceneId)
            };
        
        case PROJECT_ACTIONS.UPDATE_SCENE_SUCCESS:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { ...scene, ...action.payload.updates }
                        : scene
                )
            };
        
        case PROJECT_ACTIONS.UPDATE_GENERATED_IMAGE_INDEX:
            return {
                ...state,
                scenes: state.scenes.map(scene => 
                    scene.id === action.payload.sceneId 
                        ? { 
                            ...scene,
                            generatedImages: scene.generatedImages.map(img =>
                                img.id === action.payload.imageId
                                    ? { ...img, selectedImageIdx: action.payload.selectedIndex }
                                    : img
                            )
                          }
                        : scene
                )
            };
        
        default:
            return state;
    }
}
