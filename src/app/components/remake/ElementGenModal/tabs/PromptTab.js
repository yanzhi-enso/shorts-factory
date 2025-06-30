"use client";

import React, { useState, useCallback } from 'react';
import { useProjectManager } from 'app/hocs/ProjectManager';
import Dropdown from 'app/components/common/Dropdown';
import { ASSET_TYPES } from 'constants/gcs';
import styles from '../ElementGenModal.module.css';

const PromptTab = ({ 
    name, 
    description, 
    onImageGenerated, 
    onClose 
}) => {
    const { projectState, addElementImage } = useProjectManager();
    
    // State management
    const [selectedImages, setSelectedImages] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [selectedGeneratedImage, setSelectedGeneratedImage] = useState(null);
    const [generationError, setGenerationError] = useState(null);

    // Dropdown options for number of images
    const numberOptions = [
        { value: 1, label: '1 image' },
        { value: 2, label: '2 images' },
        { value: 3, label: '3 images' },
        { value: 4, label: '4 images' },
        { value: 5, label: '5 images' },
        { value: 6, label: '6 images' },
        { value: 7, label: '7 images' },
        { value: 8, label: '8 images' },
        { value: 9, label: '9 images' },
        { value: 10, label: '10 images' }
    ];

    // Helper function to convert image URL to base64
    const convertImageToBase64 = async (imageUrl) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting image to base64:', error);
            throw error;
        }
    };

    // Convert multiple images to base64
    const convertImagesToBase64 = async (images) => {
        const base64Array = [];
        for (const image of images) {
            const base64 = await convertImageToBase64(image.gcsUrl);
            base64Array.push(base64);
        }
        return base64Array;
    };

    // Handle element image selection
    const handleImageSelection = useCallback((elementImage) => {
        setSelectedImages(prev => {
            const isSelected = prev.some(img => img.id === elementImage.id);
            
            if (isSelected) {
                // Remove from selection
                return prev.filter(img => img.id !== elementImage.id);
            } else {
                // Add to selection (max 10)
                if (prev.length >= 10) {
                    return prev; // Don't add if already at max
                }
                return [...prev, elementImage];
            }
        });
    }, []);

    // Clear all selected images
    const handleClearAll = useCallback(() => {
        setSelectedImages([]);
    }, []);

    // Handle generation
    const handleGenerate = useCallback(async () => {
        if (!prompt.trim() || !projectState.curProjId) {
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);
        
        try {
            const isTextOnly = selectedImages.length === 0;
            let apiResult;
            
            if (isTextOnly) {
                // Text-to-image generation
                apiResult = await fetch('/api/workflows/txt2img/gen_img', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt.trim(),
                        n: numberOfImages,
                        project_id: projectState.curProjId,
                        asset_type: ASSET_TYPES.ELEMENT_IMAGES
                    })
                });
            } else {
                // Image extension with reference images
                const imageBase64Array = await convertImagesToBase64(selectedImages);
                
                apiResult = await fetch('/api/workflows/img2img/extend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        images: imageBase64Array,
                        prompt: prompt.trim(),
                        n: numberOfImages,
                        project_id: projectState.curProjId,
                        asset_type: ASSET_TYPES.ELEMENT_IMAGES
                    })
                });
            }
            
            if (!apiResult.ok) {
                const errorData = await apiResult.json();
                throw new Error(errorData.error || 'Generation failed');
            }
            
            const data = await apiResult.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Generation failed');
            }
            
            // Store generated images in local state (draft mode)
            const newGeneratedImages = data.result.images.map((imageData, index) => ({
                id: `generated_${Date.now()}_${index}`,
                imageUrl: imageData.imageUrl,
                revisedPrompt: imageData.revisedPrompt,
                generationSources: {
                    type: isTextOnly ? 'text-to-image' : 'image-extension',
                    prompt: prompt.trim(),
                    referenceImages: isTextOnly ? null : selectedImages.map(img => img.gcsUrl),
                    revisedPrompt: imageData.revisedPrompt
                }
            }));
            
            setGeneratedImages(newGeneratedImages);
            
            // Auto-select first generated image
            if (newGeneratedImages.length > 0) {
                setSelectedGeneratedImage(newGeneratedImages[0]);
            }
            
        } catch (error) {
            console.error('Generation failed:', error);
            if (error.message === 'CONTENT_MODERATION_BLOCKED') {
                setGenerationError('Content was blocked by moderation filters. Please try a different prompt.');
            } else {
                setGenerationError(error.message || 'Failed to generate images. Please try again.');
            }
        } finally {
            setIsGenerating(false);
        }
    }, [prompt, selectedImages, numberOfImages, projectState.curProjId]);

    // Handle saving selected generated image
    const handleSave = useCallback(async () => {
        if (!selectedGeneratedImage) {
            return;
        }

        try {
            const result = await addElementImage(
                selectedGeneratedImage.imageUrl,
                selectedGeneratedImage.generationSources,
                name.trim() || null,
                description.trim() || null
            );
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // Success - trigger callback and close modal
            if (onImageGenerated) {
                onImageGenerated(result.elementImage);
            }

            onClose();

        } catch (error) {
            console.error('Save failed:', error);
            setGenerationError(error.message || 'Failed to save image. Please try again.');
        }
    }, [selectedGeneratedImage, addElementImage, name, description, onImageGenerated, onClose]);

    // Handle generated image selection
    const handleGeneratedImageSelection = useCallback((generatedImage) => {
        setSelectedGeneratedImage(generatedImage);
    }, []);

    // Check if an element image is selected
    const isElementImageSelected = useCallback((elementImage) => {
        return selectedImages.some(img => img.id === elementImage.id);
    }, [selectedImages]);

    return (
        <div className={styles.tabContent}>
            {/* Reference Images Section */}
            <div className={styles.referenceImagesSection}>
                <label className={styles.sectionLabel}>
                    Reference Images (tap to select, max 10):
                </label>
                
                {projectState.elementImages.length > 0 ? (
                    <>
                        <div className={styles.imageScrollContainer}>
                            {projectState.elementImages.map((elementImage) => (
                                <div
                                    key={elementImage.id}
                                    className={`${styles.elementImageItem} ${
                                        isElementImageSelected(elementImage) ? styles.selected : ''
                                    }`}
                                    onClick={() => handleImageSelection(elementImage)}
                                >
                                    <img
                                        src={elementImage.gcsUrl}
                                        alt={elementImage.name || 'Element image'}
                                        className={styles.elementImage}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        <div className={styles.selectionCounter}>
                            <span>Selected: {selectedImages.length}/10</span>
                            {selectedImages.length > 0 && (
                                <button
                                    className={styles.clearAllButton}
                                    onClick={handleClearAll}
                                    disabled={isGenerating}
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.noImagesMessage}>
                        No element images available. Upload some images first to use as references.
                    </div>
                )}
            </div>

            {/* Prompt Input Section */}
            <div className={styles.promptSection}>
                <label htmlFor="prompt" className={styles.sectionLabel}>
                    Text Prompt *
                </label>
                <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the element you want to generate..."
                    className={styles.promptTextarea}
                    rows={4}
                    disabled={isGenerating}
                />
            </div>

            {/* Generation Options */}
            <div className={styles.optionsSection}>
                <label className={styles.sectionLabel}>
                    Number of images to generate:
                </label>
                <Dropdown
                    value={numberOfImages}
                    onChange={setNumberOfImages}
                    options={numberOptions}
                    disabled={isGenerating}
                />
            </div>

            {/* Generate Button */}
            {generatedImages.length === 0 && (
                <div className={styles.generateSection}>
                    <button
                        className={styles.generateButton}
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                    >
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            )}

            {/* Generated Images Preview */}
            {generatedImages.length > 0 && (
                <div className={styles.previewSection}>
                    <label className={styles.sectionLabel}>
                        Generated Images (select one to save):
                    </label>
                    
                    <div className={styles.generatedImagesGrid}>
                        {generatedImages.map((generatedImage) => (
                            <div
                                key={generatedImage.id}
                                className={styles.generatedImageItem}
                            >
                                <img
                                    src={generatedImage.imageUrl}
                                    alt="Generated image"
                                    className={`${styles.generatedImageThumbnail} ${
                                        selectedGeneratedImage?.id === generatedImage.id ? styles.selected : ''
                                    }`}
                                    onClick={() => handleGeneratedImageSelection(generatedImage)}
                                />
                                <input
                                    type="radio"
                                    name="generatedImage"
                                    checked={selectedGeneratedImage?.id === generatedImage.id}
                                    onChange={() => handleGeneratedImageSelection(generatedImage)}
                                    className={styles.radioSelector}
                                />
                            </div>
                        ))}
                    </div>
                    
                    <div className={styles.saveSection}>
                        <button
                            className={styles.saveButton}
                            onClick={handleSave}
                            disabled={!selectedGeneratedImage}
                        >
                            Save Selected
                        </button>
                        <button
                            className={styles.regenerateButton}
                            onClick={() => {
                                setGeneratedImages([]);
                                setSelectedGeneratedImage(null);
                                setGenerationError(null);
                            }}
                        >
                            Generate New
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {generationError && (
                <div className={styles.errorMessage}>
                    {generationError}
                </div>
            )}
        </div>
    );
};

export default PromptTab;
