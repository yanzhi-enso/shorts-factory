// This file store utils for client-side operations that interact with the backend API.

export async function analyzeImage(imageUrl, storyContext = null, sceneDescription = null) {
    try {
        const response = await fetch(
            '/api/workflows/txt2img/image_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageUrl,
                storyContext,
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
