// This file store utils for client-side operations that interact with the backend API.

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
    storyContext = null,
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
                storyContext,
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

export async function generateImage(prompt, n = 1) {
    try {
        const response = await fetch(
            '/api/workflows/txt2img/gen_img', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                n
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
                image: imageBase64,
                prompt,
                ...options
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate video');
        }
        
        return data;
    } catch (error) {
        console.error('Error generating video:', error);
        throw error;
    }
}

export async function getVideoTaskStatus(taskId) {
    try {
        const response = await fetch(`/api/services/kling/video/${taskId}`, {
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
