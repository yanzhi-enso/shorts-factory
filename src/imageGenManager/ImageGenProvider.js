"use client";

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { generateImage, extendImage } from 'services/backend';
import { ASSET_TYPES } from 'constants/gcs';
import { useProjectManager } from 'projectManager/useProjectManager';

// Action types
const IMAGE_GEN_ACTIONS = {
    START_GENERATION: 'START_GENERATION',
    GENERATION_SUCCESS: 'GENERATION_SUCCESS',
    GENERATION_ERROR: 'GENERATION_ERROR',
    REMOVE_PENDING: 'REMOVE_PENDING'
};

// Initial state
const initialState = {
    pendingGenerations: []
};

// Reducer
function imageGenReducer(state, action) {
    switch (action.type) {
        case IMAGE_GEN_ACTIONS.START_GENERATION:
            return {
                ...state,
                pendingGenerations: [...state.pendingGenerations, action.payload]
            };
        
        case IMAGE_GEN_ACTIONS.GENERATION_SUCCESS:
        case IMAGE_GEN_ACTIONS.GENERATION_ERROR:
        case IMAGE_GEN_ACTIONS.REMOVE_PENDING:
            return {
                ...state,
                pendingGenerations: state.pendingGenerations.filter(
                    gen => gen.id !== action.payload.id
                )
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
    const { projectState, addElementImage } = useProjectManager();

    const startElementImageGeneration = useCallback(async ({
        prompt,
        selectedImages = [],
        numberOfImages = 1,
        name = null,
        description = null
    }) => {
        if (!prompt.trim() || !projectState.curProjId) {
            throw new Error('Prompt and project ID are required');
        }

        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const isTextOnly = selectedImages.length === 0;

        // Add to pending state immediately
        const pendingItem = {
            id: generationId,
            type: isTextOnly ? 'text-to-image' : 'image-extension',
            prompt: prompt.trim(),
            referenceImages: isTextOnly ? null : selectedImages.map(img => {
                return img.gcsUrls?.[img.selectedImageIdx] || img.gcsUrls?.[0];
            }),
            numberOfImages,
            name,
            description,
            status: 'generating',
            startTime: Date.now()
        };

        dispatch({
            type: IMAGE_GEN_ACTIONS.START_GENERATION,
            payload: pendingItem
        });

        try {
            let result;
            
            if (isTextOnly) {
                // Text-to-image generation
                result = await generateImage(
                    prompt.trim(),
                    numberOfImages,
                    projectState.curProjId,
                    ASSET_TYPES.ELEMENT_IMAGES
                );
            } else {
                // Image extension
                const imageUrls = selectedImages.map(img => {
                    return img.gcsUrls?.[img.selectedImageIdx] || img.gcsUrls?.[0];
                });
                result = await extendImage(
                    imageUrls,
                    prompt.trim(),
                    numberOfImages,
                    projectState.curProjId,
                    ASSET_TYPES.ELEMENT_IMAGES
                );
            }

            // Collect all generated image URLs
            const allImageUrls = result.images.map(imageData => imageData.imageUrl);

            // Create generation sources using the first image's revised prompt (they should be similar)
            const generationSources = {
                type: isTextOnly ? 'text-to-image' : 'image-extension',
                prompt: prompt.trim(),
                referenceImages: isTextOnly ? null : selectedImages.map(img => {
                    return img.gcsUrls?.[img.selectedImageIdx] || img.gcsUrls?.[0];
                }),
                revisedPrompt: result.images[0]?.revisedPrompt
            };

            // Add single element image with all variants
            await addElementImage(
                allImageUrls, // All generated images as variants
                generationSources,
                name?.trim() || null,
                description?.trim() || null
            );

            // Remove from pending state
            dispatch({
                type: IMAGE_GEN_ACTIONS.GENERATION_SUCCESS,
                payload: { id: generationId }
            });

            return { success: true, generationId };

        } catch (error) {
            console.error('Element image generation failed:', error);
            
            // Update pending item with error state
            dispatch({
                type: IMAGE_GEN_ACTIONS.GENERATION_ERROR,
                payload: { id: generationId, error: error.message }
            });

            throw error;
        }
    }, [projectState.curProjId, addElementImage]);

    const removePendingGeneration = useCallback((generationId) => {
        dispatch({
            type: IMAGE_GEN_ACTIONS.REMOVE_PENDING,
            payload: { id: generationId }
        });
    }, []);

    const contextValue = {
        pendingGenerations: state.pendingGenerations,
        startElementImageGeneration,
        removePendingGeneration
    };

    return (
        <ImageGenContext.Provider value={contextValue}>
            {children}
        </ImageGenContext.Provider>
    );
};

// Hook for consuming components
export const useImageGen = () => {
    const context = useContext(ImageGenContext);
    if (!context) {
        throw new Error('useImageGen must be used within an ImageGenProvider');
    }
    return context;
};
