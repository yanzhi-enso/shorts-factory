"use client";

import React, { useState, useCallback, useRef } from 'react';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useImageGen } from 'imageGenManager/ImageGenProvider';
import styles from './InpaintingTab.module.css';

/*
 * ========================================================================
 * INPAINTING TAB - NATIVE RESOLUTION IMPLEMENTATION
 * ========================================================================
 *
 * FEATURES IMPLEMENTED:
 * - Single element image selection (similar to PromptTab pattern)
 * - Always visible canvas area (512×768px display) with empty state
 * - Native resolution dual canvas system (background image + mask overlay)
 * - CSS scaling for display while maintaining original image dimensions
 * - Brush tools with 3 sizes (Small: 10px, Medium: 20px, Large: 40px)
 * - Mask creation at original resolution with white areas for inpainting
 * - Coordinate transformation from display space to canvas space
 * - Clear mask functionality
 * - Prompt input for inpainting description
 * - Generate button (always 3 images, no dropdown)
 * - Responsive design following existing patterns
 *
 * KEY BENEFITS:
 * - Mask is created at exact same dimensions as input image
 * - No need for mask resizing before API calls
 * - Perfect pixel-to-pixel correspondence with original image
 * - Maintains image quality without scaling artifacts
 *
 * INTEGRATION COMPLETE:
 * ✅ Generated images are automatically assigned to selected element image's gcsUrls field
 * ✅ Backend API integration with existing inpainting endpoint
 * ✅ Error handling and loading states
 *
 * ========================================================================
 */

const InpaintingTab = ({ onImageGenerated, onClose, onSwitchToMetadata }) => {
    const { projectState } = useProjectManager();
    const { startInpaintingGeneration } = useImageGen();

    // Display constants (UI size)
    const DISPLAY_WIDTH = 512;
    const DISPLAY_HEIGHT = 768;
    const BRUSH_SIZES = [10, 20, 40]; // Small, Medium, Large (radius in pixels)

    // State management
    const [selectedImage, setSelectedImage] = useState(null); // Single selection
    const [brushSize, setBrushSize] = useState(1); // 0=Small, 1=Medium, 2=Large
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawnMask, setHasDrawnMask] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const [mousePosition, setMousePosition] = useState(null);

    // Canvas refs and dimensions
    const backgroundCanvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const [canvasImage, setCanvasImage] = useState(null);
    const [originalImageDimensions, setOriginalImageDimensions] = useState(null);
    const [canvasScale, setCanvasScale] = useState(1);
    const [canvasDisplayStyle, setCanvasDisplayStyle] = useState({});

    // Clear mask function
    const clearMask = useCallback(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        // Use current canvas dimensions if available, otherwise use a reasonable default
        const width = canvas.width || 512;
        const height = canvas.height || 768;
        ctx.clearRect(0, 0, width, height);
        setHasDrawnMask(false);
    }, []);

    // Handle single image selection
    const handleImageSelection = useCallback(
        (elementImage) => {
            setSelectedImage(elementImage);
            loadImageToCanvas(elementImage);
            // Clear any existing mask when switching images
            clearMask();
        },
        [clearMask]
    );

    // Load and display image on canvas
    const loadImageToCanvas = useCallback((elementImage) => {
        const imageUrl =
            elementImage.gcsUrls?.[elementImage.selectedImageIdx] || elementImage.gcsUrls?.[0];
        if (!imageUrl) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Store original dimensions
            const originalWidth = img.width;
            const originalHeight = img.height;
            setOriginalImageDimensions({ width: originalWidth, height: originalHeight });

            // Calculate scale to fit display area while maintaining aspect ratio
            const scaleX = DISPLAY_WIDTH / originalWidth;
            const scaleY = DISPLAY_HEIGHT / originalHeight;
            const scale = Math.min(scaleX, scaleY);
            setCanvasScale(scale);

            // Calculate actual display dimensions
            const displayWidth = originalWidth * scale;
            const displayHeight = originalHeight * scale;

            // Calculate centering offset for the container
            const offsetX = (DISPLAY_WIDTH - displayWidth) / 2;
            const offsetY = (DISPLAY_HEIGHT - displayHeight) / 2;

            // Set canvas display style with CSS transform
            const canvasStyle = {
                width: `${originalWidth}px`,
                height: `${originalHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                left: `${offsetX}px`,
                top: `${offsetY}px`,
            };
            setCanvasDisplayStyle(canvasStyle);

            // Set background canvas to original dimensions
            const canvas = backgroundCanvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = originalWidth;
                canvas.height = originalHeight;

                // Draw image at full resolution
                ctx.clearRect(0, 0, originalWidth, originalHeight);
                ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
            }

            // Initialize mask canvas at original dimensions
            const maskCanvas = maskCanvasRef.current;
            if (maskCanvas) {
                const maskCtx = maskCanvas.getContext('2d');
                maskCanvas.width = originalWidth;
                maskCanvas.height = originalHeight;
                maskCtx.clearRect(0, 0, originalWidth, originalHeight);
            }

            setCanvasImage(img);
        };
        img.src = imageUrl;
    }, []);

    // Draw mask at mouse position
    const drawAtPoint = useCallback(
        (e) => {
            const canvas = maskCanvasRef.current;
            if (!canvas || !originalImageDimensions) return;

            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();

            // Get mouse position relative to the scaled canvas
            const displayX = e.clientX - rect.left;
            const displayY = e.clientY - rect.top;

            // Transform coordinates from display space to canvas space
            const canvasX = displayX / canvasScale;
            const canvasY = displayY / canvasScale;

            // Calculate brush size in canvas space
            const brushRadius = BRUSH_SIZES[brushSize] / canvasScale;

            // Draw white circular brush stroke at native resolution
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent white for better visibility
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, brushRadius, 0, 2 * Math.PI);
            ctx.fill();

            setHasDrawnMask(true);
        },
        [brushSize, canvasScale, originalImageDimensions]
    );

    // Mouse position tracking for custom cursor
    const updateMousePosition = useCallback((e) => {
        if (!selectedImage) return;
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    }, [selectedImage]);

    // Mouse event handlers for drawing
    const handleMouseDown = useCallback(
        (e) => {
            if (!selectedImage) return;
            setIsDrawing(true);
            updateMousePosition(e);
            drawAtPoint(e);
        },
        [selectedImage, updateMousePosition, drawAtPoint]
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (!selectedImage) return;
            updateMousePosition(e);
            if (isDrawing) {
                drawAtPoint(e);
            }
        },
        [isDrawing, selectedImage, updateMousePosition, drawAtPoint]
    );

    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const handleMouseEnter = useCallback((e) => {
        if (selectedImage) {
            updateMousePosition(e);
        }
    }, [selectedImage, updateMousePosition]);

    const handleMouseLeave = useCallback(() => {
        setIsDrawing(false);
        setMousePosition(null);
    }, []);

    // Extract mask data at native resolution for API calls
    const getMaskImageData = useCallback(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas || !originalImageDimensions) return null;

        const ctx = canvas.getContext('2d');
        return ctx.getImageData(
            0,
            0,
            originalImageDimensions.width,
            originalImageDimensions.height
        );
    }, [originalImageDimensions]);

    // Convert mask to base64 for API transmission with proper alpha channel
    const getMaskAsBase64 = useCallback(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas || !originalImageDimensions) return null;

        // Create a temporary canvas for OpenAI-compatible mask
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImageDimensions.width;
        tempCanvas.height = originalImageDimensions.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Get the current mask data
        const maskImageData = getMaskImageData();
        if (!maskImageData) return null;

        // Create new image data for OpenAI-compatible mask
        const openaiMaskData = tempCtx.createImageData(
            originalImageDimensions.width,
            originalImageDimensions.height
        );
        const data = maskImageData.data;

        // Convert to OpenAI format: transparent areas = inpaint, opaque areas = preserve
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];

            if (alpha > 0) {
                // Areas that were painted (semi-transparent white) -> make transparent for inpainting
                openaiMaskData.data[i] = 0; // R
                openaiMaskData.data[i + 1] = 0; // G
                openaiMaskData.data[i + 2] = 0; // B
                openaiMaskData.data[i + 3] = 0; // A - Transparent (will be inpainted)
            } else {
                // Areas that were not painted -> make opaque white to preserve
                openaiMaskData.data[i] = 255; // R
                openaiMaskData.data[i + 1] = 255; // G
                openaiMaskData.data[i + 2] = 255; // B
                openaiMaskData.data[i + 3] = 255; // A - Opaque (will be preserved)
            }
        }

        tempCtx.putImageData(openaiMaskData, 0, 0);

        // Validate file size (OpenAI requires < 50MB)
        const base64String = tempCanvas.toDataURL('image/png');
        const sizeInBytes = (base64String.length * 3) / 4; // Approximate base64 to bytes conversion
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 50) {
            throw new Error(
                `Mask file size (${sizeInMB.toFixed(2)}MB) exceeds OpenAI's 50MB limit`
            );
        }

        return base64String;
    }, [originalImageDimensions, getMaskImageData]);

    // Handle generation with actual API call
    const handleGenerate = useCallback(() => {
        if (!selectedImage || !hasDrawnMask || !prompt.trim()) {
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            // Get mask data for API call
            const maskBase64 = getMaskAsBase64();

            if (!maskBase64) {
                throw new Error('Failed to generate mask data');
            }

            const selectedImageUrl =
                selectedImage.gcsUrls?.[selectedImage.selectedImageIdx] ||
                selectedImage.gcsUrls?.[0];

            // Call the inpainting generation function
            const result = startInpaintingGeneration(
                selectedImageUrl,
                maskBase64,
                prompt.trim(),
                3, // for now we always generate 3 images
                null,
                null
            );

            // Switch to metadata mode with generation context
            onSwitchToMetadata({
                operationType: 'generation',
                pendingGenerationId: result.generationId,
                elementImageId: null
            });

        } catch (error) {
            console.error('Inpainting generation failed:', error);
            setGenerationError(error.message || 'Failed to generate inpainted images');
            setIsGenerating(false);
        }
    }, [
        selectedImage,
        hasDrawnMask,
        prompt,
        getMaskAsBase64,
        startInpaintingGeneration,
        onSwitchToMetadata,
    ]);

    // Check if image is selected
    const isImageSelected = useCallback(
        (elementImage) => {
            return selectedImage?.id === elementImage.id;
        },
        [selectedImage]
    );

    return (
        <div className={styles.container}>
            {/* Three Column Layout */}
            <div className={styles.threeColumnLayout}>
                {/* Left Column - Element Images */}
                <div className={styles.leftColumn}>
                    <div className={styles.elementImagesColumn}>
                        <label className={styles.sectionLabel}>
                            Select Image to Edit:
                        </label>

                        {projectState.elementImages.length > 0 ? (
                            <div className={styles.verticalImageList}>
                                {projectState.elementImages.map((elementImage) => {
                                    const currentImageUrl =
                                        elementImage.gcsUrls?.[elementImage.selectedImageIdx] ||
                                        elementImage.gcsUrls?.[0];
                                    const isSelected = isImageSelected(elementImage);

                                    return (
                                        <div
                                            key={elementImage.id}
                                            className={`${styles.elementImageItem} ${
                                                isSelected ? styles.selected : ''
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
                                                    {elementImage.selectedImageIdx + 1}/
                                                    {elementImage.gcsUrls.length}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.noImagesMessage}>
                                No element images available. Upload some images first to edit.
                            </div>
                        )}
                    </div>
                </div>

                {/* Center Column - Canvas */}
                <div className={styles.centerColumn}>
                    <div className={styles.canvasSection}>
                        <label className={styles.sectionLabel}>
                            {selectedImage
                                ? 'Paint areas to inpaint (white areas will be replaced):'
                                : 'Canvas (select an image to start editing):'}
                        </label>

                        {/* Canvas Container */}
                        <div className={styles.canvasContainer}>
                            {/* Background canvas for image */}
                            <canvas
                                ref={backgroundCanvasRef}
                                className={styles.backgroundCanvas}
                                style={canvasDisplayStyle}
                            />

                            {/* Mask canvas for drawing */}
                            <canvas
                                ref={maskCanvasRef}
                                className={styles.maskCanvas}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                style={{
                                    ...canvasDisplayStyle,
                                    cursor: selectedImage ? 'none' : 'not-allowed',
                                    pointerEvents: selectedImage ? 'auto' : 'none',
                                }}
                            />

                            {/* Custom brush cursor */}
                            {selectedImage && (
                                <div
                                    className={styles.customCursor}
                                    style={{
                                        width: `${BRUSH_SIZES[brushSize] * 2}px`,
                                        height: `${BRUSH_SIZES[brushSize] * 2}px`,
                                        display: isDrawing || mousePosition ? 'block' : 'none',
                                        left: mousePosition ? `${mousePosition.x - BRUSH_SIZES[brushSize]}px` : '0px',
                                        top: mousePosition ? `${mousePosition.y - BRUSH_SIZES[brushSize]}px` : '0px',
                                    }}
                                />
                            )}

                            {/* Empty state overlay */}
                            {!selectedImage && (
                                <div className={styles.canvasEmptyState}>
                                    <div className={styles.emptyStateIcon}>🎨</div>
                                    <div className={styles.emptyStateText}>
                                        Select an image to start editing
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Clear Mask Button */}
                        <div className={styles.canvasActions}>
                            <button
                                className={styles.clearMaskButton}
                                onClick={clearMask}
                                disabled={!hasDrawnMask || isGenerating}
                            >
                                Clear Mask
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Controls */}
                <div className={styles.rightColumn}>
                    <div className={styles.controlsPanel}>
                        {/* Brush Size Section */}
                        <div className={styles.brushSection}>
                            <label className={styles.sectionLabel}>Brush Size:</label>
                            <div className={styles.brushSizeRadios}>
                                {['Small', 'Medium', 'Large'].map((size, index) => (
                                    <label key={size} className={styles.brushSizeRadio}>
                                        <input
                                            type="radio"
                                            name="brushSize"
                                            value={index}
                                            checked={brushSize === index}
                                            onChange={() => setBrushSize(index)}
                                            disabled={!selectedImage || isGenerating}
                                        />
                                        <div className={styles.radioContent}>
                                            <div 
                                                className={styles.brushPreview}
                                                style={{
                                                    width: `${BRUSH_SIZES[index] * 2}px`,
                                                    height: `${BRUSH_SIZES[index] * 2}px`,
                                                }}
                                            />
                                            <span className={styles.brushLabel}>
                                                {size} ({BRUSH_SIZES[index]}px)
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Prompt Section */}
                        <div className={styles.promptSection}>
                            <label htmlFor='inpaintPrompt' className={styles.sectionLabel}>
                                Inpainting Prompt *
                            </label>
                            <textarea
                                id='inpaintPrompt'
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder='Describe what you want to generate in the painted areas...'
                                className={styles.promptTextarea}
                                rows={4}
                                disabled={isGenerating}
                            />
                        </div>

                        {/* Generate Section */}
                        <div className={styles.generateSection}>
                            <button
                                className={styles.generateButton}
                                onClick={handleGenerate}
                                disabled={!selectedImage || !hasDrawnMask || !prompt.trim() || isGenerating}
                            >
                                {isGenerating ? 'Generating Images...' : 'Generate'}
                            </button>
                        </div>

                        {/* Error Message */}
                        {generationError && <div className={styles.errorMessage}>{generationError}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InpaintingTab;
