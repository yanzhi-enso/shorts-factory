"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useImageGenContext } from 'app/components/remake/ImageRequestManager'
import { useProjectManager } from 'projectManager/useProjectManager'
import Dropdown from 'app/components/common/Dropdown';
import ReferenceImageStack from '../components/ReferenceImageStack';
import styles from './PromptTab.module.css';
import { ASSET_TYPES } from 'constants/gcs';
import { IMAGE_SIZE_LANDSCAPE, IMAGE_SIZE_PORTRAIT } from 'constants/image';

const PromptTab = ({ onClose, prefillData }) => {
    const { projectState } = useProjectManager()
    const { elementImages } = projectState
    const { startImageGeneration } = useImageGenContext()

    // State management
    const [referenceImageStack, setReferenceImageStack] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [imageSize, setImageSize] = useState(IMAGE_SIZE_PORTRAIT);
    const [numberOfImages, setNumberOfImages] = useState(4);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const [validationError, setValidationError] = useState(null);

    // Handle prefill data
    useEffect(() => {
        if (prefillData) {
            // Set prompt
            if (prefillData.prompt) {
                setPrompt(prefillData.prompt);
            }

            // Set size
            if (prefillData.size) {
                setImageSize(prefillData.size);
            }

            // Convert srcImages to referenceImageStack format
            if (prefillData.srcImages && prefillData.srcImages.length > 0) {
                const convertedStack = prefillData.srcImages.map((srcImage, index) => ({
                    id: Date.now() + index,
                    type: srcImage.url ? 'url' : 'base64',
                    url: srcImage.url,
                    base64: srcImage.base64,
                    fileName: `image-${index + 1}`,
                }));
                setReferenceImageStack(convertedStack);
            }
        }
    }, [prefillData]);

    // Dropdown options for number of images
    const numberOptions = [
        { value: 1, label: '1 image' },
        { value: 2, label: '2 images' },
        { value: 3, label: '3 images' },
        { value: 4, label: '4 images' },
        { value: 5, label: '5 images' },
    ];

    const ImageSizeSelector = () => {
        return (
            <div className={styles.imageSizeRadioGroup}>
                <input
                    type='radio'
                    id='portrait'
                    name='imgSize'
                    checked={imageSize == IMAGE_SIZE_PORTRAIT}
                    onChange={() => {
                        setImageSize(IMAGE_SIZE_PORTRAIT);
                    }}
                />
                <label htmlFor='portrait'>Portrait</label>
                <input
                    type='radio'
                    id='landscape'
                    name='imgSize'
                    checked={imageSize == IMAGE_SIZE_LANDSCAPE}
                    onChange={() => {
                        setImageSize(IMAGE_SIZE_LANDSCAPE);
                    }}
                />
                <label htmlFor='landscape'>Landscape</label>
            </div>
        );
    };

    // Handle adding image to reference stack from library
    const handleAddToStack = useCallback(
        (imageRecord) => {
            if (referenceImageStack.length >= 10) return; // Respect 10-image limit

            const imageUrl = imageRecord.gcsUrls?.[imageRecord.selectedImageIdx || 0];
            setReferenceImageStack((prev) => [
                ...prev,
                {
                    id: Date.now() + Math.random(),
                    url: imageUrl,
                    sourceRecord: imageRecord,
                    type: 'url',
                },
            ]);
        },
        [referenceImageStack.length]
    );

    // Handle removing image from reference stack
    const handleRemoveFromStack = useCallback((stackEntryId) => {
        setReferenceImageStack((prev) => prev.filter((entry) => entry.id !== stackEntryId));
    }, []);

    // Clear all reference images from stack
    const handleClearAll = useCallback(() => {
        setReferenceImageStack([]);
    }, []);

    // Handle adding image from ReferenceImageStack component
    const handleAddImageFromStack = useCallback((newStackEntry, error) => {
        if (error) {
            setValidationError(error);
            setTimeout(() => setValidationError(null), 3000);
        } else if (newStackEntry) {
            setReferenceImageStack((prev) => [...prev, newStackEntry]);
        }
    }, []);

    // Handle generation
    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            // Convert reference stack to srcImages format for the ImageContext API
            const srcImages = referenceImageStack.map((stackEntry) => {
                if (stackEntry.type === 'url') {
                    return { url: stackEntry.url };
                } else {
                    return { base64: stackEntry.base64 };
                }
            });

            startImageGeneration(
                prompt.trim(),
                srcImages,
                numberOfImages,
                imageSize,
                ASSET_TYPES.ELEMENT_IMAGES,
            );

            // Close modal on successful generation start
            onClose();
        } catch (error) {
            console.error('Generation failed:', error);
            if (error.message === 'CONTENT_MODERATION_BLOCKED') {
                setGenerationError(
                    'Content was blocked by moderation filters. Please try a different prompt.'
                );
            } else {
                setGenerationError(error.message || 'Failed to generate images. Please try again.');
            }
            setIsGenerating(false);
        }
    }, [prompt, referenceImageStack, numberOfImages, startImageGeneration, imageSize, onClose]);

    return (
        <div className={styles.tabContent}>
            {/* Two Column Layout */}
            <div className={styles.twoColumnLayout}>
                {/* Left Column - Element Images */}
                <div className={styles.leftColumn}>
                    <div className={styles.elementImagesColumn}>
                        <label className={styles.sectionLabel}>Previous Results:</label>

                        {elementImages.length > 0 ? (
                            <>
                                <div className={styles.verticalImageList}>
                                    {elementImages.map((record) => {
                                        const isDisabled = referenceImageStack.length >= 10;
                                        return (
                                            <div
                                                key={record.id}
                                                className={`${styles.elementImageItem} ${
                                                    isDisabled ? styles.disabled : ''
                                                }`}
                                                onClick={() =>
                                                    !isDisabled && handleAddToStack(record)
                                                }
                                                style={{
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                <img
                                                    src={
                                                        record.gcsUrls?.[
                                                            record.selectedImageIdx || 0
                                                        ]
                                                    }
                                                    alt={record.prompt || 'Generated image'}
                                                    className={styles.elementImage}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className={styles.noImagesMessage}>
                                No images available. Generate some images first to use as
                                references.
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.divider} />

                {/* Right Column - Prompt Input Area */}
                <div className={styles.rightColumn}>
                    <div className={styles.promptInputPanel}>
                        {/* Reference Image Stack Component */}
                        <ReferenceImageStack
                            referenceImageStack={referenceImageStack}
                            onAddImage={handleAddImageFromStack}
                            onRemoveImage={handleRemoveFromStack}
                            onClearAll={handleClearAll}
                            maxImages={10}
                            disabled={isGenerating}
                            validationError={validationError}
                        />

                        {/* Prompt Input Section */}
                        <div className={styles.promptSection}>
                            <label htmlFor='prompt' className={styles.sectionLabel}>
                                Text Prompt *
                            </label>
                            <textarea
                                id='prompt'
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder='Describe the element you want to generate...'
                                className={styles.promptTextarea}
                                rows={3}
                                disabled={isGenerating}
                            />
                        </div>

                        {/* Generation Options */}
                        <div className={styles.optionsSection}>
                            <label className={styles.optionLabel}>Size:</label>
                            <ImageSizeSelector />
                            <div className={styles.middle} />
                            <label className={styles.optionLabel}>No. images:</label>
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
                            <div className={styles.errorMessage}>{generationError}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptTab;
