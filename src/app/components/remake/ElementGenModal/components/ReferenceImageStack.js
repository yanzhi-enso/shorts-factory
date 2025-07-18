"use client";

import React, { useCallback } from 'react';
import { useImageDropAndPaste } from 'app/hooks/useImageDropAndPaste';
import styles from './ReferenceImageStack.module.css';

const ReferenceImageStack = ({
    referenceImageStack = [],
    onAddImage,
    onRemoveImage,
    onClearAll,
    maxImages = 10,
    disabled = false,
    validationError = null
}) => {
    // Validate image file
    const validateImageFile = useCallback((file) => {
        // Check if it's a supported image file (will be converted to PNG)
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return 'Only PNG/JPG/WebP images are supported';
        }

        return null;
    }, []);

    // Validate image dimensions
    const validateImageDimensions = useCallback((img) => {
        const { width, height } = img;
        if (width < 768 || width > 2048 || height < 768 || height > 2048) {
            return 'Image dimensions must be between 768x768 and 2048x2048 pixels';
        }
        return null;
    }, []);

    // Convert file to base64
    const fileToBase64 = useCallback((file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }, []);

    // Handle adding base64 image to stack
    const handleAddBase64ToStack = useCallback(async (file) => {
        if (referenceImageStack.length >= maxImages) {
            if (onAddImage) {
                onAddImage(null, `Maximum ${maxImages} images allowed in stack`);
            }
            return;
        }

        // Validate file type
        const fileError = validateImageFile(file);
        if (fileError) {
            if (onAddImage) {
                onAddImage(null, fileError);
            }
            return;
        }

        try {
            // Convert to base64
            const base64 = await fileToBase64(file);
            
            // Create image element to check dimensions
            const img = new Image();
            img.onload = () => {
                // Validate dimensions
                const dimensionError = validateImageDimensions(img);
                if (dimensionError) {
                    if (onAddImage) {
                        onAddImage(null, dimensionError);
                    }
                    return;
                }

                // Add to stack
                const newStackEntry = {
                    id: Date.now() + Math.random(),
                    base64,
                    type: 'base64',
                    fileName: file.name,
                    dimensions: { width: img.width, height: img.height }
                };

                if (onAddImage) {
                    onAddImage(newStackEntry, null);
                }
            };
            img.onerror = () => {
                if (onAddImage) {
                    onAddImage(null, 'Failed to load image');
                }
            };
            img.src = base64;
        } catch (error) {
            if (onAddImage) {
                // Check if it's a conversion error
                if (error.message && error.message.includes('conversion failed')) {
                    onAddImage(null, 'Unable to process image - conversion failed');
                } else {
                    onAddImage(null, 'Failed to process image file');
                }
            }
        }
    }, [referenceImageStack.length, maxImages, validateImageFile, validateImageDimensions, fileToBase64, onAddImage]);

    // Use the shared hook for drag & drop and paste functionality
    const {
        isDragOver,
        isFocused,
        isHovered,
        elementRef,
        dragHandlers,
        pasteHandlers,
        focusHandlers
    } = useImageDropAndPaste({
        onFileProcessed: handleAddBase64ToStack,
        disabled,
        enablePaste: true,
        enableDrop: true,
        multiple: true,
        convertToPng: true
    });

    const handleRemoveFromStack = useCallback((stackEntryId) => {
        if (onRemoveImage) {
            onRemoveImage(stackEntryId);
        }
    }, [onRemoveImage]);

    const handleClearAll = useCallback(() => {
        if (onClearAll) {
            onClearAll();
        }
    }, [onClearAll]);

    return (
        <div className={styles.referenceStackSection}>
            <div className={styles.sectionHeader}>
                <label className={styles.sectionLabel}>
                    Reference Images ({referenceImageStack.length}/{maxImages})
                </label>
                {referenceImageStack.length > 0 && (
                    <div className={styles.stackActions}>
                        <button
                            className={styles.clearAllButton}
                            onClick={handleClearAll}
                            disabled={disabled}
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>
            <div
                ref={elementRef}
                tabIndex={0}
                className={`${styles.referenceStack} ${
                    referenceImageStack.length === 0 ? styles.emptyDropZone : ''
                } ${isDragOver ? styles.dragOver : ''} ${isFocused ? styles.focused : ''} ${
                    isHovered ? styles.hovered : ''
                } ${disabled ? styles.disabled : ''}`}
                {...dragHandlers}
                {...pasteHandlers}
                {...focusHandlers}
            >
                {referenceImageStack.length > 0 ? (
                    referenceImageStack.map((stackEntry) => (
                        <div
                            key={stackEntry.id}
                            className={styles.stackImageItem}
                            onClick={() => !disabled && handleRemoveFromStack(stackEntry.id)}
                        >
                            <img
                                src={stackEntry.type === 'url' ? stackEntry.url : stackEntry.base64}
                                alt='Reference image'
                                className={styles.stackImage}
                            />
                            <div className={styles.removeIcon}>×</div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyStateMessage}>
                        {isHovered
                            ? 'Ready to paste! Press Ctrl+V or drag and drop PNG/JPG/WebP files here'
                            : 'Pick one from left, drag and drop, or hover and paste PNG/JPG/WebP files here'}
                    </div>
                )}
            </div>
            {validationError && <div className={styles.validationError}>{validationError}</div>}
        </div>
    );
};

export default ReferenceImageStack;
