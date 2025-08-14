"use client";

import { useState, useMemo } from 'react';
import { FaChevronLeft } from 'react-icons/fa';
import styles from './SceneRow.module.css';
import ReferenceImageBlock from 'app/components/common/ReferenceImageBlock';
import SceneGenBlock from './SceneGenBlock';
import SceneControlPanel from './SceneControlPanel';
import { analyzeImage } from 'services/backend';
import { useImageGenContext } from 'app/components/remake/ImageRequestManager';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useElementManager } from '../ElementList/ElementSelectionManager';
import { ASSET_TYPES } from 'constants/gcs';
import { IMAGE_SIZE_PORTRAIT } from 'constants/image';

const SceneRow = ({
    scene,
    sceneIndex,
    totalScenes,
    storyConfig,
    isCollapsed,
    onToggleCollapse,
    onReferenceImageClick,
    onOpenHistoryModal,
}) => {
    const { handleSceneImageUpload, projectState, updateSelectedGeneratedImage, clearReferenceImage } =
        useProjectManager();

    // Access isAdvMode setting from project state
    const isAdvMode = projectState.currentProject?.settings?.isAdvMode;

    // ImageRequestManager integration
    const { startImageGeneration, pendingGenerations } = useImageGenContext();

    // ElementSelectionManager integration
    const { focusedSceneId, selectedElements, setElements, resetElements } = useElementManager();

    // Parse scene properties
    const {
        id: sceneId, // Now using UUID directly
        selectedImage,
    } = scene;

    // Determine focus state for styling
    const isFocused = focusedSceneId === sceneId;
    const isUnfocused = focusedSceneId !== null && focusedSceneId !== sceneId;

    // Dynamic display name based on array position
    const sceneDisplayName = `Scene-${sceneIndex + 1}`;
    const originalImage = {
        imageUrl: selectedImage,
        title: `${sceneDisplayName} Original`,
    };

    // Internal states
    const [prompt, setPrompt] = useState('');
    const [isPromptAssistantRunning, setIsPromptAssistantRunning] = useState(false);
    const [imageCount, setImageCount] = useState(2);

    // Derive isGenerating from pendingGenerations to sync UI with actual generation state
    const isGenerating = useMemo(() => {
        return pendingGenerations.some(
            (pending) =>
                pending.sceneId === sceneId &&
                pending.assetType === ASSET_TYPES.GENERATED_SCENE_IMAGES
        );
    }, [pendingGenerations, sceneId]);

    const handlePromptChange = (newPrompt) => {
        setPrompt(newPrompt);
    };

    const handlePromptAssistant = async () => {
        if (isPromptAssistantRunning) return;

        setIsPromptAssistantRunning(true);

        let imageUrls = [];

        if (originalImage.imageUrl) {
            imageUrls.push(originalImage.imageUrl);
        }

        if (selectedElements[sceneId]?.length > 0) {
            // Get selected elements for this scene
            imageUrls = imageUrls.concat(selectedElements[sceneId]);
        }

        try {
            const result = await analyzeImage(
                imageUrls,
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
        if (!prompt || isGenerating) return;

        try {
            // Get selected elements for this scene and convert to srcImages format
            const selectedElementUrls = selectedElements[sceneId] || [];

            const srcImages = selectedElementUrls.map((url) => ({ url }));

            // Add originalImage.url if it exists
            if (originalImage.imageUrl) {
                srcImages.unshift({ url: originalImage.imageUrl });
            }

            // Get image size from project settings, default to portrait
            const imageSize =
                projectState.currentProject?.settings?.image_size || IMAGE_SIZE_PORTRAIT;

            startImageGeneration(
                prompt.trim(),
                srcImages, // Empty array for text-only, populated for image-extension
                imageCount,
                imageSize,
                ASSET_TYPES.GENERATED_SCENE_IMAGES,
                null, // name
                null, // description
                sceneId // Add sceneId for scene generations
            );

            // ImageRequestManager handles all result processing automatically
            // isGenerating state is now derived from pendingGenerations
        } catch (error) {
            console.error('Error starting generation:', error);
            alert(`Error generating image for ${sceneId}: ${error.message}`);
        }
    };

    const handleImageUploadInternal = async (imageFile) => {
        // Call ProjectManager's image upload handler
        const result = await handleSceneImageUpload(sceneId, imageFile);

        if (!result.success) {
            console.error('Image upload failed:', result.error);
            // Error handling is already done in ProjectManager (shows alert)
        } else {
            console.log('Image uploaded successfully:', result.publicUrl);
        }
    };

    const handleImageSelect = async (imageId) => {
        // Call ProjectManager to update selected generated image
        await updateSelectedGeneratedImage(sceneId, imageId);
    };

    const handleEditFromHistory = (editData) => {
        // Update prompt state
        setPrompt(editData.prompt || '');

        // Update image count
        setImageCount(editData.imageCount || 2); // default to 4 images

        // Update selected elements if srcImages exist
        if (editData.srcImages && editData.srcImages.length > 0) {
            // Extract URLs from srcImages array
            const elementUrls = editData.srcImages.map((img) => img.url).filter((url) => url); // Filter out any null/undefined URLs

            // Set elements for this scene using ElementSelectionManager
            setElements(sceneId, elementUrls);
        } else {
            // Clear selected elements if no srcImages
            resetElements(sceneId);
        }
    };

    // Create a wrapped function for opening history modal with edit callback
    const handleOpenHistoryModal = (scene) => {
        if (onOpenHistoryModal) {
            onOpenHistoryModal(scene, handleEditFromHistory);
        }
    };

    // Handler for resetting the reference image
    const handleResetReferenceImage = async (sceneId) => {
        try {
            const result = await clearReferenceImage(sceneId);
            if (!result.success) {
                console.error('Failed to clear reference image:', result.error);
                alert(`Failed to clear reference image: ${result.error}`);
            }
        } catch (error) {
            console.error('Error clearing reference image:', error);
            alert(`Error clearing reference image: ${error.message}`);
        }
    };

    // Scene title or fallback
    const displayTitle = scene.title || 'Untitled Scene';

    // If collapsed, show compact one-line view
    if (isCollapsed) {
        return (
            <div
                className={`${styles.sceneRow} ${styles.collapsed} ${
                    isFocused ? styles.focused : ''
                } ${isUnfocused ? styles.unfocused : ''}`}
            >
                <div className={styles.collapsedContent}>
                    <span className={styles.sceneLabel}>Scene {sceneIndex + 1}</span>
                    <span className={styles.sceneTitle}>{displayTitle}</span>
                </div>
                <button
                    className={styles.expandButton}
                    onClick={onToggleCollapse}
                    aria-label='Expand scene'
                >
                    <FaChevronLeft className={styles.chevron} />
                </button>
            </div>
        );
    }

    // Expanded view (original layout)
    return (
        <div
            className={`${styles.sceneRow} ${isFocused ? styles.focused : ''} ${
                isUnfocused ? styles.unfocused : ''
            }`}
        >
            {/* Scene Number Indicator */}
            <div className={styles.sceneNumberIndicator}>
                {sceneIndex + 1}/{totalScenes}
            </div>

            {/* Collapse Button */}
            <button
                className={`${styles.expandButton} ${styles.expandedState}`}
                onClick={onToggleCollapse}
                aria-label='Collapse scene'
            >
                <FaChevronLeft className={`${styles.chevron} ${styles.expanded}`} />
            </button>

            {/* Reference Image */}
            <div className={styles.imageSection}>
                <ReferenceImageBlock 
                    scene={scene} 
                    onImageClick={onReferenceImageClick} 
                    onImageReset={handleResetReferenceImage}
                />
            </div>

            {/* Control Panel */}
            <div className={styles.controlSection}>
                {/* Only pass prompt assistant props when advanced mode is enabled */}
                <SceneControlPanel
                    sceneId={sceneId}
                    prompt={prompt}
                    onPromptChange={handlePromptChange}
                    showPromptAssistant={isAdvMode}
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
            <div className={`${styles.imageSection} ${styles.genImage}`}>
                <SceneGenBlock
                    scene={scene}
                    sceneDisplayName={sceneDisplayName}
                    onOpenHistoryModal={handleOpenHistoryModal}
                />
            </div>
        </div>
    );
};

export default SceneRow;
