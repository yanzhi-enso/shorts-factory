"use client";

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { generateImage, extendImage, inpaintingImage } from 'services/backend';
import { useProjectManager } from 'projectManager/useProjectManager';
import { ASSET_TYPES } from 'constants/gcs';

// Action type
const IMAGE_GEN_ACTIONS = {
    START_GENERATION: 'START_GENERATION',
    GENERATION_SUCCESS: 'GENERATION_SUCCESS',
    GENERATION_ERROR: 'GENERATION_ERROR',
    REMOVE_PENDING: 'REMOVE_PENDING',
    UPDATE_PENDING_METADATA: 'UPDATE_PENDING_METADATA',
};

// Initial state
const initialState = {
    pendingGenerations: [],
};

// Reducer
function imageGenReducer(state, action) {
    switch (action.type) {
        case IMAGE_GEN_ACTIONS.START_GENERATION:
            console.log('start generation is called, adding to pending state:', action.payload);
            return {
                ...state,
                pendingGenerations: [...state.pendingGenerations, action.payload],
            };

        case IMAGE_GEN_ACTIONS.UPDATE_PENDING_METADATA:
            return {
                ...state,
                pendingGenerations: state.pendingGenerations.map(gen =>
                    gen.id === action.payload.id
                        ? { ...gen, pendingMetadata: action.payload.metadata }
                        : gen
                ),
            };

        case IMAGE_GEN_ACTIONS.GENERATION_SUCCESS:
        case IMAGE_GEN_ACTIONS.GENERATION_ERROR:
        case IMAGE_GEN_ACTIONS.REMOVE_PENDING:
            return {
                ...state,
                pendingGenerations: state.pendingGenerations.filter(
                    (gen) => gen.id !== action.payload.id
                ),
            };

        default:
            return state;
    }
}

// Context
const ImageGenContext = createContext();

// Provider component
export const ImageGenProvider = ({ children }) => {
    const [state, dispatch] = useReducer(imageGenReducer, initialState);
    const { projectState, addElementImage, updateElementImage, addGeneratedImage } = useProjectManager();
    
    // Use ref to access current state in async functions
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const executeGeneration = useCallback(
        async (
            generationId,
            isTextOnly,
            prompt,
            selectedImages,
            numberOfImages,
            size,
            projectId,
            assetType,
            name,
            description,
            sceneId
        ) => {
            try {
                let result;

                if (isTextOnly) {
                    // Text-to-image generation
                    result = await generateImage(
                        prompt.trim(),
                        size,
                        numberOfImages,
                        projectId,
                        assetType
                    );
                } else {
                    // Image extension
                    result = await extendImage(
                        selectedImages,
                        prompt.trim(),
                        size,
                        numberOfImages,
                        projectId,
                        assetType
                    );
                }

                // Collect all generated image URLs
                const allImageUrls = result.images.map((imageData) => imageData.imageUrl);

                // Create generation sources using the first image's revised prompt (they should be similar)
                const generationSources = {
                    type: isTextOnly ? 'text-to-image' : 'image-extension',
                    prompt: prompt.trim(),
                    srcImages: isTextOnly
                        ? null
                        : selectedImages.map((img) => {
                              if (img.url) {
                                  return { url: img.url };
                              } else if (img.base64) {
                                  return { base64: img.base64 };
                              }
                          }),
                    size,
                    revisedPrompt: result.images[0]?.revisedPrompt,
                };

                // Handle result based on asset type
                if (assetType === ASSET_TYPES.ELEMENT_IMAGES) {
                    // Element image handling
                    const elementImageResult = await addElementImage(
                        allImageUrls,
                        generationSources,
                        name?.trim() || null,
                        description?.trim() || null
                    );

                    // Apply pending metadata only for element images
                    const currentPendingItem = stateRef.current.pendingGenerations.find(
                        (gen) => gen.id === generationId
                    );
                    if (currentPendingItem?.pendingMetadata && elementImageResult.elementImage) {
                        try {
                            await updateElementImage(
                                elementImageResult.elementImage.id,
                                currentPendingItem.pendingMetadata
                            );
                        } catch (error) {
                            console.error('Failed to apply pending metadata:', error);
                            // Continue even if metadata application fails
                        }
                    }
                } else if (assetType === ASSET_TYPES.GENERATED_SCENE_IMAGES) {
                    // Scene image handling - simpler, no metadata support
                    await addGeneratedImage(sceneId, allImageUrls, generationSources);
                }

                // Remove from pending state
                dispatch({
                    type: IMAGE_GEN_ACTIONS.GENERATION_SUCCESS,
                    payload: { id: generationId },
                });
            } catch (error) {
                console.error('Image generation failed:', error);

                // Update pending item with error state
                dispatch({
                    type: IMAGE_GEN_ACTIONS.GENERATION_ERROR,
                    payload: { id: generationId, error: error.message },
                });
            }
        },
        [addElementImage, updateElementImage, addGeneratedImage]
    );

    const startImageGeneration = useCallback(
        (
            prompt,
            selectedImages = [],
            numberOfImages = 1,
            size,
            assetType,
            name = null,
            description = null,
            sceneId = null
        ) => {
            if (!prompt.trim() || !projectState.curProjId) {
                throw new Error('Prompt and project ID are required');
            }

            const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const isTextOnly = selectedImages.length === 0;

            // Add to pending state immediately
            const pendingItem = {
                id: generationId,
                type: isTextOnly ? 'text-to-image' : 'image-extension',
                assetType,
                sceneId,
                prompt: prompt.trim(),
                referenceImages: isTextOnly ? null : selectedImages,
                numberOfImages,
                name,
                description,
                status: 'generating',
                startTime: Date.now(),
            };

            dispatch({
                type: IMAGE_GEN_ACTIONS.START_GENERATION,
                payload: pendingItem,
            });

            // Trigger async execution in background without closure
            executeGeneration(
                generationId,
                isTextOnly,
                prompt,
                selectedImages,
                numberOfImages,
                size,
                projectState.curProjId,
                assetType,
                name,
                description,
                sceneId
            );

            // Return immediately with generationId
            return { generationId };
        },
        [projectState.curProjId, executeGeneration]
    );

    const executeInpainting = useCallback(
        async (
            generationId,
            inputImageUrl,
            maskImage,
            prompt,
            numberOfImages,
            size,
            projectId,
            assetType,
            name,
            description
        ) => {
            try {
                // Call inpainting API
                const result = await inpaintingImage(
                    inputImageUrl,
                    maskImage,
                    prompt.trim(),
                    size,
                    numberOfImages,
                    projectId,
                    assetType
                );

                // Collect all generated image URLs
                const newImageUrls = result.images.map((imageData) => imageData.imageUrl);

                // Create generation sources for tracking
                const generationSources = {
                    type: 'inpainting',
                    prompt: prompt.trim(),
                    srcImages: [{ url: inputImageUrl }],
                    maskImage: maskImage,
                    size,
                    revisedPrompt: result.images[0]?.revisedPrompt,
                };

                const elementImageResult = await addElementImage(
                    newImageUrls, // All generated images as variants
                    generationSources,
                    name?.trim() || null,
                    description?.trim() || null
                );

                // Check if there's pending metadata for this generation
                // Access current state via ref to avoid stale closure
                const currentPendingItem = stateRef.current.pendingGenerations.find(
                    (gen) => gen.id === generationId
                );
                if (currentPendingItem?.pendingMetadata && elementImageResult.elementImage) {
                    try {
                        await updateElementImage(
                            elementImageResult.elementImage.id,
                            currentPendingItem.pendingMetadata
                        );
                    } catch (error) {
                        console.error('Failed to apply pending metadata:', error);
                        // Continue even if metadata application fails
                    }
                }

                // Remove from pending state
                dispatch({
                    type: IMAGE_GEN_ACTIONS.GENERATION_SUCCESS,
                    payload: { id: generationId },
                });
            } catch (error) {
                console.error('Inpainting generation failed:', error);

                // Update pending item with error state
                dispatch({
                    type: IMAGE_GEN_ACTIONS.GENERATION_ERROR,
                    payload: { id: generationId, error: error.message },
                });
            }
        },
        [addElementImage, updateElementImage]
    );

    const startInpainting = useCallback(
        (
            inputImageUrl,
            maskImage,
            prompt,
            numberOfImages = 3,
            size,
            assetType,
            name = null,
            description = null
        ) => {
            if (!inputImageUrl || !maskImage || !prompt.trim() || !projectState.curProjId) {
                throw new Error('Element image, mask, prompt, and project ID are required');
            }

            const generationId = `inpaint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Add to pending state immediately
            const pendingItem = {
                id: generationId,
                type: 'inpainting',
                assetType,
                prompt: prompt.trim(),
                referenceImages: [inputImageUrl],
                numberOfImages,
                size,
                status: 'generating',
                startTime: Date.now(),
            };

            dispatch({
                type: IMAGE_GEN_ACTIONS.START_GENERATION,
                payload: pendingItem,
            });

            // Trigger async execution in background without closure
            executeInpainting(
                generationId,
                inputImageUrl,
                maskImage,
                prompt,
                numberOfImages,
                size,
                projectState.curProjId,
                assetType,
                name,
                description
            );

            // Return immediately with generationId
            return { generationId };
        },
        [projectState.curProjId, executeInpainting]
    );

    const updatePendingMetadata = useCallback((generationId, metadata) => {
        dispatch({
            type: IMAGE_GEN_ACTIONS.UPDATE_PENDING_METADATA,
            payload: { id: generationId, metadata },
        });
    }, []);

    const removePendingGeneration = useCallback((generationId) => {
        dispatch({
            type: IMAGE_GEN_ACTIONS.REMOVE_PENDING,
            payload: { id: generationId },
        });
    }, []);

    const contextValue = {
        pendingGenerations: state.pendingGenerations,
        startImageGeneration,
        startInpainting,
        updatePendingMetadata,
        removePendingGeneration,
    };

    return <ImageGenContext.Provider value={contextValue}>{children}</ImageGenContext.Provider>;
};

// Hook for consuming components
export const useImageGenContext = () => {
    const context = useContext(ImageGenContext);
    if (!context) {
        throw new Error('useImageGen must be used within an ImageGenProvider');
    }
    return context;
};
