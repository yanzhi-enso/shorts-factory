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
 * TODO - FUTURE INTEGRATION:
 * - Generated images will be automatically assigned to selected element image's gcsUrls field
 * - Backend API integration with existing inpainting endpoint
 * - Error handling and loading states
 *
 * ========================================================================
 */

const InpaintingTab = ({ name, description, onImageGenerated, onClose }) => {
    const { projectState } = useProjectManager();
    const { startInpaintingGeneration } = useImageGen(); // TODO: Function needs to be implemented

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
    const handleImageSelection = useCallback((elementImage) => {
        setSelectedImage(elementImage);
        loadImageToCanvas(elementImage);
        // Clear any existing mask when switching images
        clearMask();
    }, [clearMask]);

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

    // Mouse event handlers for drawing
    const handleMouseDown = useCallback(
        (e) => {
            if (!selectedImage) return;
            setIsDrawing(true);
            drawAtPoint(e);
        },
        [selectedImage, brushSize]
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (!isDrawing || !selectedImage) return;
            drawAtPoint(e);
        },
        [isDrawing, selectedImage, brushSize]
    );

    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
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


    // Extract mask data at native resolution for API calls
    const getMaskImageData = useCallback(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas || !originalImageDimensions) return null;

        const ctx = canvas.getContext('2d');
        return ctx.getImageData(0, 0, originalImageDimensions.width, originalImageDimensions.height);
    }, [originalImageDimensions]);

    // Convert mask to base64 for API transmission
    const getMaskAsBase64 = useCallback(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas || !originalImageDimensions) return null;

        // Create a temporary canvas with solid white mask for better API compatibility
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImageDimensions.width;
        tempCanvas.height = originalImageDimensions.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill with black background
        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, originalImageDimensions.width, originalImageDimensions.height);

        // Draw the mask with solid white
        const maskImageData = getMaskImageData();
        if (maskImageData) {
            const data = maskImageData.data;
            const solidMaskData = tempCtx.createImageData(originalImageDimensions.width, originalImageDimensions.height);
            
            // Convert semi-transparent white to solid white
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 0) {
                    // White pixel for mask area
                    solidMaskData.data[i] = 255;     // R
                    solidMaskData.data[i + 1] = 255; // G
                    solidMaskData.data[i + 2] = 255; // B
                    solidMaskData.data[i + 3] = 255; // A
                } else {
                    // Black pixel for non-mask area
                    solidMaskData.data[i] = 0;       // R
                    solidMaskData.data[i + 1] = 0;   // G
                    solidMaskData.data[i + 2] = 0;   // B
                    solidMaskData.data[i + 3] = 255; // A
                }
            }
            
            tempCtx.putImageData(solidMaskData, 0, 0);
        }

        return tempCanvas.toDataURL('image/png');
    }, [originalImageDimensions, getMaskImageData]);

    // Handle generation (UI only - no actual API call)
    const handleGenerate = useCallback(() => {
        if (!selectedImage || !hasDrawnMask || !prompt.trim()) {
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);

        // Get mask data for API call
        const maskBase64 = getMaskAsBase64();

        // Simulate generation delay for UI demonstration
        setTimeout(() => {
            setIsGenerating(false);
            console.log('TODO: Implement inpainting generation with:', {
                selectedImage: selectedImage.id,
                prompt: prompt.trim(),
                numberOfImages: 3,
                hasDrawnMask,
                originalImageDimensions,
                maskBase64: maskBase64 ? `${maskBase64.substring(0, 50)}...` : null, // Truncated for logging
            });
        }, 2000);
    }, [selectedImage, hasDrawnMask, prompt, originalImageDimensions, getMaskAsBase64]);

    // Check if image is selected
    const isImageSelected = useCallback(
        (elementImage) => {
            return selectedImage?.id === elementImage.id;
        },
        [selectedImage]
    );

    return (
        <div className={styles.tabContent}>
            {/* Element Image Selection Section */}
            <div className={styles.referenceImagesSection}>
                <label className={styles.sectionLabel}>
                    Select Image to Edit (single selection):
                </label>

                {projectState.elementImages.length > 0 ? (
                    <div className={styles.imageScrollContainer}>
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

            {/* Canvas Section - Always visible */}
            <div className={styles.canvasSection}>
                <label className={styles.sectionLabel}>
                    {selectedImage
                        ? 'Paint areas to inpaint (white areas will be replaced):'
                        : 'Canvas (select an image above to start editing):'}
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
                        onMouseLeave={handleMouseUp}
                        style={{
                            ...canvasDisplayStyle,
                            cursor: selectedImage ? 'crosshair' : 'not-allowed',
                            pointerEvents: selectedImage ? 'auto' : 'none',
                        }}
                    />

                    {/* Empty state overlay */}
                    {!selectedImage && (
                        <div className={styles.canvasEmptyState}>
                            <div className={styles.emptyStateIcon}>🎨</div>
                            <div className={styles.emptyStateText}>
                                Select an image above to start editing
                            </div>
                        </div>
                    )}
                </div>

                {/* Canvas Controls */}
                <div className={styles.canvasControls}>
                    <div className={styles.brushControls}>
                        <label className={styles.controlLabel}>Brush Size:</label>
                        <div className={styles.brushSizeOptions}>
                            {['Small', 'Medium', 'Large'].map((size, index) => (
                                <button
                                    key={size}
                                    className={`${styles.brushSizeButton} ${
                                        brushSize === index ? styles.active : ''
                                    }`}
                                    onClick={() => setBrushSize(index)}
                                    disabled={!selectedImage || isGenerating}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

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
    );
};

export default InpaintingTab;
