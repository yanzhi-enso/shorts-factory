"use client";

import React, { useState, useCallback } from 'react';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useImageGen } from 'imageGenManager/ImageGenProvider';
import Dropdown from 'app/components/common/Dropdown';
import styles from '../ElementGenModal.module.css';

const PromptTab = ({ 
    name, 
    description, 
    onImageGenerated, 
    onClose 
}) => {
    const { projectState } = useProjectManager();
    const { startElementImageGeneration } = useImageGen();
    
    // State management
    const [selectedImages, setSelectedImages] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
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
    const handleGenerate = useCallback(() => {
        if (!prompt.trim() || !projectState.curProjId) {
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);
        
        try {
            startElementImageGeneration({
                prompt: prompt.trim(),
                selectedImages,
                numberOfImages,
                name,
                description
            });

            onClose();

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
    }, [prompt, selectedImages, numberOfImages, name, description, projectState.curProjId, startElementImageGeneration, onClose]);


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
                            {projectState.elementImages.map((elementImage) => {
                                // Get current image URL from the multi-image structure
                                const currentImageUrl = elementImage.gcsUrls?.[elementImage.selectedImageIdx] || elementImage.gcsUrls?.[0];
                                
                                return (
                                    <div
                                        key={elementImage.id}
                                        className={`${styles.elementImageItem} ${
                                            isElementImageSelected(elementImage) ? styles.selected : ''
                                        }`}
                                        onClick={() => handleImageSelection(elementImage)}
                                    >
                                        <img
                                            src={currentImageUrl}
                                            alt={elementImage.name || 'Element image'}
                                            className={styles.elementImage}
                                        />
                                        {elementImage.gcsUrls?.length > 1 && (
                                            <div className={styles.imageVariantIndicator}>
                                                {elementImage.selectedImageIdx + 1}/{elementImage.gcsUrls.length}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
            <div className={styles.generateSection}>
                <button
                    className={styles.generateButton}
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                >
                    {isGenerating ? 'Generating...' : 'Generate'}
                </button>
            </div>

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
