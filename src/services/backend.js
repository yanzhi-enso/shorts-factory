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
