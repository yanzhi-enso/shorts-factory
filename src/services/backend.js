// This file store utils for client-side operations that interact with the backend API.

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
            '/api/workflows/txt2img/img_analysis', {
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
            '/api/workflows/txt2img/video_prompt', {
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

export async function generateImage(prompt, n = 1, projectId) {
    try {
        if (!projectId) {
            throw new Error('Project ID is required for image generation');
        }

        const response = await fetch(
            '/api/workflows/txt2img/gen_img', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                n,
                project_id: projectId
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate image');
        }
        
        return data.result;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function generateVideo(imageBase64, prompt, options = {}) {
    try {
        const response = await fetch('/api/services/kling/video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model_name: 'kling-v2-1',
                image: imageBase64,
                prompt,
                ...options
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            const errorMessage = data.error || 'Failed to generate video';
            
            // Check for throttling error (429 status)
            if (response.status === 429 && errorMessage.includes('parallel task over resource pack limit')) {
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

        const response = await fetch(`/api/services/kling/video/${taskId}?project_id=${encodeURIComponent(projectId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

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

export async function extendImage(images, prompt, n = 1) {
    try {
        const response = await fetch(
            '/api/workflows/img2img/extend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                images,
                prompt,
                n
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to extend image');
        }
        
        return data.result;
    } catch (error) {
        console.error('Error extending image:', error);
        throw error;
    }
}

export async function inpaintingImage(image, mask, prompt, n = 1) {
    try {
        const response = await fetch(
            '/api/workflows/img2img/inpainting', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image,
                mask,
                prompt,
                n
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to inpaint image');
        }
        
        return data.result;
    } catch (error) {
        console.error('Error inpainting image:', error);
        throw error;
    }
}
