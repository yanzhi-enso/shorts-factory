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
                scenes: state.scenes.map(scene => {
                    if (scene.id !== action.payload.sceneId) {
                        return scene;
                    }
                    
                    const newGeneratedImage = action.payload.generatedImage;
                    
                    // Derive the selected generated image URL from the new image
                    const selectedGeneratedImageUrl = newGeneratedImage && 
                        newGeneratedImage.gcsUrls && 
                        newGeneratedImage.gcsUrls.length > 0
                            ? newGeneratedImage.gcsUrls[newGeneratedImage.selectedImageIdx] || newGeneratedImage.gcsUrls[0]
                            : null;
                    
                    return { 
                        ...scene, 
                        generatedImages: [newGeneratedImage, ...scene.generatedImages],
                        selectedGeneratedImageId: newGeneratedImage.id,
                        selectedGeneratedImage: selectedGeneratedImageUrl
                    };
                })
            };
        
        case PROJECT_ACTIONS.UPDATE_GENERATED_IMAGE_SELECTION:
            return {
                ...state,
                scenes: state.scenes.map(scene => {
                    if (scene.id !== action.payload.sceneId) {
                        return scene;
                    }
                    
                    // Find the selected generated image to derive its URL
                    const selectedGeneratedImage = scene.generatedImages.find(
                        img => img.id === action.payload.imageId
                    );
                    
                    // Derive the selected generated image URL
                    const selectedGeneratedImageUrl = selectedGeneratedImage && 
                        selectedGeneratedImage.gcsUrls && 
                        selectedGeneratedImage.gcsUrls.length > 0
                            ? selectedGeneratedImage.gcsUrls[selectedGeneratedImage.selectedImageIdx] || selectedGeneratedImage.gcsUrls[0]
                            : null;
                    
                    return { 
                        ...scene, 
                        selectedGeneratedImageId: action.payload.imageId,
                        selectedGeneratedImage: selectedGeneratedImageUrl
                    };
                })
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
                scenes: state.scenes.map(scene => {
                    if (scene.id !== action.payload.sceneId) {
                        return scene;
                    }
                    
                    // Update the generated image's selected index
                    const updatedGeneratedImages = scene.generatedImages.map(img =>
                        img.id === action.payload.imageId
                            ? { ...img, selectedImageIdx: action.payload.selectedIndex }
                            : img
                    );
                    
                    // If this is the currently selected generated image, update the URL
                    let updatedSelectedGeneratedImage = scene.selectedGeneratedImage;
                    if (scene.selectedGeneratedImageId === action.payload.imageId) {
                        const updatedGeneratedImage = updatedGeneratedImages.find(
                            img => img.id === action.payload.imageId
                        );
                        updatedSelectedGeneratedImage = updatedGeneratedImage && 
                            updatedGeneratedImage.gcsUrls && 
                            updatedGeneratedImage.gcsUrls.length > 0
                                ? updatedGeneratedImage.gcsUrls[action.payload.selectedIndex] || updatedGeneratedImage.gcsUrls[0]
                                : null;
                    }
                    
                    return { 
                        ...scene,
                        generatedImages: updatedGeneratedImages,
                        selectedGeneratedImage: updatedSelectedGeneratedImage
                    };
                })
            };
        
        case PROJECT_ACTIONS.UPDATE_SCENE_ORDERS_SUCCESS:
            return {
                ...state,
                scenes: action.payload.reorderedScenes
            };
        
        default:
            return state;
    }
}
