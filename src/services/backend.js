// This file store utils for client-side operations that interact with the backend API.

import { ASSET_TYPES } from '../constants/gcs';

// Custom error classes for Kling API
class KlingError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'KlingError';
        this.status = status;
    }
}

class KlingThrottleError extends KlingError {
    constructor(message) {
        super(message, 429);
        this.name = 'KlingThrottleError';
    }
}

// Export error classes
export { KlingError, KlingThrottleError };

export async function analyzeImage(
    imageUrl,
    storyContext = null,
    globalChangeRequest = null,
    sceneDescription = null
) {
    try {
        const response = await fetch(
            '/api/services/image/analysis/image_prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageUrl,
                storyContext,
                globalChangeRequest,
                sceneDescription
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze image');
        }
        
        return data.result;
    } catch (error) {
        console.error('Error analyzing image:', error);
        throw error;
    }
}

export async function analyzeImageForVideo(
    imageUrl,
    sceneImagePrompt,
    storyDescription = null,
    sceneDescription = null
) {
    try {
        const response = await fetch(
            '/api/services/image/analysis/video_prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageUrl,
                sceneImagePrompt,
                storyDescription,
                sceneDescription
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze image for video');
        }
        
        return data.result;
    } catch (error) {
        console.error('Error analyzing image for video:', error);
        throw error;
    }
}

export async function generateImage(prompt, size = null, n = 1, projectId, assetType) {
    try {
        // Validate projectId
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error('Project ID is required and must be a non-empty string');
        }

        // Validate assetType
        const validAssetTypes = Object.values(ASSET_TYPES);
        if (!assetType || !validAssetTypes.includes(assetType)) {
            throw new Error(`Asset type is required and must be one of: ${validAssetTypes.join(', ')}`);
        }

        const response = await fetch(
            '/api/services/image/txt2img', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                size,
                n,
                project_id: projectId,
                asset_type: assetType
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            // Handle content moderation error specifically
            if (response.status === 403 && data.error === 'CONTENT_MODERATION_BLOCKED') {
                throw new Error('CONTENT_MODERATION_BLOCKED');
            }
            throw new Error(data.error || 'Failed to generate image');
        }
        
        return data.data.images;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function generateVideo(imageBase64, prompt, options = {}) {
    try {
        const response = await fetch('/api/services/video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model_name: 'kling-v2-1',
                image: imageBase64,
                prompt,
                ...options,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.error || 'Failed to generate video';

            // Check for throttling error (429 status)
            if (
                response.status === 429 &&
                errorMessage.includes('parallel task over resource pack limit')
            ) {
                // Don't log throttling errors as they are expected
                throw new KlingThrottleError(errorMessage);
            }

            // Log other errors normally
            console.error('Error generating video:', errorMessage);
            throw new KlingError(errorMessage, response.status);
        }

        return data;
    } catch (error) {
        // Re-throw custom errors without additional logging
        if (error instanceof KlingError) {
            throw error;
        }

        // Log and wrap unexpected errors
        console.error('Error generating video:', error);
        throw error;
    }
}

export async function getVideoTaskStatus(taskId, projectId) {
    try {
        if (!projectId) {
            throw new Error('Project ID is required for video task status');
        }

        const response = await fetch(
            `/api/services/video/${taskId}?project_id=${encodeURIComponent(projectId)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get video task status');
        }

        return data;
    } catch (error) {
        console.error('Error getting video task status:', error);
        throw error;
    }
}

export async function extendImage(images, prompt, size = null, n = 1, projectId, assetType) {
    try {
        // Validate projectId
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error('Project ID is required and must be a non-empty string');
        }

        // Validate assetType
        const validAssetTypes = Object.values(ASSET_TYPES);
        if (!assetType || !validAssetTypes.includes(assetType)) {
            throw new Error(`Asset type is required and must be one of: ${validAssetTypes.join(', ')}`);
        }

        const response = await fetch(
            '/api/services/image/extend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                images,
                prompt,
                size,
                n,
                project_id: projectId,
                asset_type: assetType
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            // Handle content moderation error specifically
            if (response.status === 403 && data.error === 'CONTENT_MODERATION_BLOCKED') {
                throw new Error('CONTENT_MODERATION_BLOCKED');
            }
            throw new Error(data.error || 'Failed to extend image');
        }
        
        return data.data.images;
    } catch (error) {
        console.error('Error extending image:', error);
        throw error;
    }
}

export async function inpaintingImage(image_gcs_url, mask, prompt, size = null, n = 1, projectId, assetType) {
    try {
        // Validate projectId
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error('Project ID is required and must be a non-empty string');
        }

        // Validate assetType
        const validAssetTypes = Object.values(ASSET_TYPES);
        if (!assetType || !validAssetTypes.includes(assetType)) {
            throw new Error(
                `Asset type is required and must be one of: ${validAssetTypes.join(', ')}`
            );
        }

        // Validate mask format (should be data URL with PNG format)
        if (!mask || typeof mask !== 'string') {
            throw new Error('Mask is required and must be a base64 string');
        }

        if (!mask.startsWith('data:image/png;base64,')) {
            throw new Error('Mask must be a PNG image in data URL format');
        }

        // Validate mask size (approximate check for 50MB limit)
        const base64Data = mask.replace(/^data:image\/png;base64,/, '');
        const sizeInBytes = (base64Data.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        if (sizeInMB > 50) {
            throw new Error(`Mask file size (${sizeInMB.toFixed(2)}MB) exceeds OpenAI's 50MB limit`);
        }

        const response = await fetch('/api/services/image/inpainting', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_gcs_url,
                mask,
                prompt,
                size,
                n,
                project_id: projectId,
                asset_type: assetType,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle content moderation error specifically
            if (response.status === 403 && data.error === 'CONTENT_MODERATION_BLOCKED') {
                throw new Error('CONTENT_MODERATION_BLOCKED');
            }
            throw new Error(data.error || 'Failed to inpaint image');
        }

        return data.data.images;
    } catch (error) {
        console.error('Error inpainting image:', error);
        throw error;
    }
}

export async function getSignedUrl(projectId, imageType) {
    try {
        if (!projectId) {
            throw new Error('Project ID is required for signed URL request');
        }
        
        if (!imageType) {
            throw new Error('Image type is required for signed URL request');
        }

        const response = await fetch('/api/upload/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                project_id: projectId,
                image_type: imageType 
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get signed URL');
        }
        
        return data; // Returns { signed_url, public_url, image_id }
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
}

export async function deleteGCSAssets(gcsUrls) {
    try {
        if (!Array.isArray(gcsUrls) || gcsUrls.length === 0) {
            throw new Error('GCS URLs must be provided as a non-empty array');
        }

        const response = await fetch('/api/delete/gcs_assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: gcsUrls })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete GCS assets');
        }
        
        return data; // Returns { success: true, message, results }
    } catch (error) {
        console.error('Error deleting GCS assets:', error);
        throw error;
    }
}
