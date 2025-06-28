"use client";

import { useState } from 'react';
import styles from './SceneRow.module.css';
import RemakeImageBlock from './RemakeImageBlock';
import SceneGenBlock from './SceneGenBlock';
import SceneControlPanel from './SceneControlPanel';
import { analyzeImage, generateImage } from 'services/backend';
import { useProjectManager } from 'app/hocs/ProjectManager';
import { ASSET_TYPES } from 'constants/gcs';

const SceneRow = ({ scene, storyConfig }) => {
    const { 
        addGeneratedImage,
        updateSelectedGeneratedImage,
        handleSceneImageUpload,
        projectState 
    } = useProjectManager();

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
            // Get project ID from ProjectManager state
            const { curProjId } = projectState;
            
            if (!curProjId) {
                throw new Error('No project ID available');
            }

            const result = await generateImage(prompt, imageCount, curProjId, ASSET_TYPES.GENERATED_SCENE_IMAGES);

            // Handle multiple images response
            if (result?.images && Array.isArray(result.images)) {
                // Add each generated image to ProjectManager
                for (const imgData of result.images) {
                    const generationSources = {
                        prompt: prompt,
                        revisedPrompt: imgData.revisedPrompt || result.revisedPrompt || prompt,
                    };

                    await addGeneratedImage(sceneDbId, imgData.imageUrl, generationSources);
                }
            } else if (result?.imageUrl) {
                // Single image returned (backward compatibility)
                const generationSources = {
                    prompt: prompt,
                    revisedPrompt: result?.revisedPrompt || prompt,
                };

                await addGeneratedImage(sceneDbId, result.imageUrl, generationSources);
            }
        } catch (error) {
            console.error('Error generating image:', error);
            alert(`Error generating image for ${sceneId}: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImageUploadInternal = async (imageFile) => {
        // Call ProjectManager's image upload handler
        const result = await handleSceneImageUpload(sceneDbId, imageFile);

        if (!result.success) {
            console.error('Image upload failed:', result.error);
            // Error handling is already done in ProjectManager (shows alert)
        } else {
            console.log('Image uploaded successfully:', result.publicUrl);
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
                <SceneGenBlock
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
