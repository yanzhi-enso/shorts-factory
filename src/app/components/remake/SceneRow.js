"use client";

import { useState } from 'react';
import styles from './SceneRow.module.css';
import RemakeImageBlock from './RemakeImageBlock';
import GeneratedImageBlock from './GeneratedImageBlock';
import SceneControlPanel from './SceneControlPanel';
import { analyzeImage, generateImage } from 'services/backend';
import { useProjectManager } from 'app/hocs/ProjectManager';

const SceneRow = ({ scene, storyConfig }) => {
    const { addGeneratedImage, updateSelectedGeneratedImage, handleImageUpload } =
        useProjectManager();

    // Parse scene properties
    const {
        id: sceneDbId,
        sceneOrder,
        selectedImage,
        generatedImages,
        selectedGeneratedImage,
        selectedGeneratedImageId,
    } = scene;

    const sceneId = `Scene-${sceneOrder / 100}`;
    const originalImage = {
        imageUrl: selectedImage,
        title: `Scene ${sceneOrder / 100} Original`,
    };

    // Internal states
    const [prompt, setPrompt] = useState('');
    const [isPromptAssistantRunning, setIsPromptAssistantRunning] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [imageCount, setImageCount] = useState(1);

    const handlePromptChange = (newPrompt) => {
        setPrompt(newPrompt);
    };

    const handlePromptAssistant = async () => {
        if (!originalImage.imageUrl || isPromptAssistantRunning) return;

        setIsPromptAssistantRunning(true);

        try {
            const result = await analyzeImage(
                originalImage.imageUrl,
                storyConfig?.storyDescription || null,
                storyConfig?.changeRequest || null,
                prompt || null
            );

            setPrompt(result);
        } catch (error) {
            console.error('Error with Prompt Assistant:', error);
            alert(`Error with Prompt Assistant for ${sceneId}: ${error.message}`);
        } finally {
            setIsPromptAssistantRunning(false);
        }
    };

    const handleGenerate = async () => {
        if (!originalImage.imageUrl || !prompt || isGenerating) return;

        setIsGenerating(true);

        try {
            const result = await generateImage(prompt, imageCount);

            // Handle multiple images response
            if (result?.images && Array.isArray(result.images)) {
                // Add each generated image to ProjectManager
                for (const imgData of result.images) {
                    const imageDataUrl = `data:image/png;base64,${imgData.imageBase64}`;
                    const generationSources = {
                        prompt: prompt,
                        revisedPrompt: imgData.revisedPrompt || result.revisedPrompt || prompt,
                    };

                    await addGeneratedImage(sceneDbId, imageDataUrl, generationSources);
                }
            } else if (result?.imageBase64) {
                // Single image returned (backward compatibility)
                const imageDataUrl = `data:image/png;base64,${result.imageBase64}`;
                const generationSources = {
                    prompt: prompt,
                    revisedPrompt: result?.revisedPrompt || prompt,
                };

                await addGeneratedImage(sceneDbId, imageDataUrl, generationSources);
            }
        } catch (error) {
            console.error('Error generating image:', error);
            alert(`Error generating image for ${sceneId}: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImageUploadInternal = async (imageFile) => {
        // Call ProjectManager's placeholder upload handler
        const result = await handleImageUpload(sceneDbId, imageFile);

        if (!result.success) {
            console.log('Image upload:', result.error);
            // For now, just show the error since upload is not implemented
            alert(`Image upload not yet implemented: ${result.error}`);
        }
    };

    const handleImageSelect = async (imageId) => {
        // Call ProjectManager to update selected generated image
        await updateSelectedGeneratedImage(sceneDbId, imageId);
    };

    const handleOriginalClick = (imageUrl, title) => {
        // Could open full-size modal in the future
        console.log('Original image clicked:', { imageUrl, title });
    };

    return (
        <div className={styles.sceneRow}>
            {/* Original Image */}
            <div className={styles.imageSection}>
                <RemakeImageBlock
                    imageUrl={originalImage.imageUrl}
                    title={originalImage.title}
                    onClick={handleOriginalClick}
                />
            </div>

            {/* Control Panel */}
            <div className={styles.controlSection}>
                <SceneControlPanel
                    prompt={prompt}
                    onPromptChange={handlePromptChange}
                    onPromptAssistant={handlePromptAssistant}
                    isPromptAssistantRunning={isPromptAssistantRunning}
                    referenceImages={[]} // Will be populated later
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    imageCount={imageCount}
                    onImageCountChange={setImageCount}
                />
            </div>

            {/* Generated Image */}
            <div className={styles.imageSection}>
                <GeneratedImageBlock
                    sceneId={sceneId}
                    generatedImages={generatedImages}
                    selectedGeneratedImage={selectedGeneratedImage}
                    selectedGeneratedImageId={selectedGeneratedImageId}
                    onImageUpload={handleImageUploadInternal}
                    onImageSelect={handleImageSelect}
                />
            </div>
        </div>
    );
};

export default SceneRow;
