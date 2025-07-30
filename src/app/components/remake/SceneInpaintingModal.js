"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { convertOpenAIMaskToDisplayFormat } from 'utils/common/image';
import { useImageGenContext } from 'app/components/remake/ImageRequestManager';
import styles from './SceneInpaintingModal.module.css';
import { IMAGE_SIZE_LANDSCAPE, IMAGE_SIZE_PORTRAIT } from 'constants/image';
import { ASSET_TYPES } from 'constants/gcs';
import { FaTimes } from 'react-icons/fa';

const SceneInpaintingModal = ({ isOpen, inpaintingData, onClose }) => {
    // Brush sizes for display (radius in pixels)
    const BRUSH_SIZES = [10, 20, 40]; // Small, Medium, Large (radius in pixels)

    const { startInpainting } = useImageGenContext();

    // State management
    const [brushSize, setBrushSize] = useState(1); // 0=Small, 1=Medium, 2=Large
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawnMask, setHasDrawnMask] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [imageSize, setImageSize] = useState(null); // auto-detected
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const [mousePosition, setMousePosition] = useState(null);
    const [detectedOrientation, setDetectedOrientation] = useState(null); // 'portrait' | 'landscape'

    // Canvas refs and dimensions
    const maskCanvasRef = useRef(null);
    const [originalImageDimensions, setOriginalImageDimensions] = useState(null);

    const selectedImageUrl = inpaintingData?.imageUrl;
    const sceneId = inpaintingData?.sceneId;

    // Auto-hide error message for content moderation
    useEffect(() => {
        if (generationError && generationError.includes('Content moderation check failed')) {
            const timer = setTimeout(() => {
                setGenerationError(null);
            }, 4000); // 4 seconds
            
            return () => clearTimeout(timer);
        }
    }, [generationError]);

    // Load and setup image when modal opens or image changes
    useEffect(() => {
        if (isOpen && selectedImageUrl) {
            loadImageToCanvas();
        }
    }, [isOpen, selectedImageUrl]);

    // Reset generation state when modal opens for fresh session
    useEffect(() => {
        if (isOpen) {
            setIsGenerating(false);
            setGenerationError(null);
        }
    }, [isOpen]);

    // Clear mask function
    const clearMask = useCallback(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width || 512;
        const height = canvas.height || 768;
        ctx.clearRect(0, 0, width, height);
        setHasDrawnMask(false);
    }, []);

    // Load and display image on canvas
    const loadImageToCanvas = useCallback(() => {
        if (!selectedImageUrl) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Store original dimensions
            const originalWidth = img.width;
            const originalHeight = img.height;
            setOriginalImageDimensions({ width: originalWidth, height: originalHeight });

            // Auto-detect orientation and set image size
            const isPortrait = originalHeight > originalWidth;
            const detectedOrient = isPortrait ? 'portrait' : 'landscape';
            const autoImageSize = isPortrait ? IMAGE_SIZE_PORTRAIT : IMAGE_SIZE_LANDSCAPE;

            setDetectedOrientation(detectedOrient);
            setImageSize(autoImageSize);

            // Initialize mask canvas at original dimensions
            const maskCanvas = maskCanvasRef.current;
            if (maskCanvas) {
                const maskCtx = maskCanvas.getContext('2d');
                maskCanvas.width = originalWidth;
                maskCanvas.height = originalHeight;
                maskCtx.clearRect(0, 0, originalWidth, originalHeight);
            }
        };
        img.src = selectedImageUrl;
    }, [selectedImageUrl]);

    // Draw mask at mouse position
    const drawAtPoint = useCallback(
        (e) => {
            const canvas = maskCanvasRef.current;
            if (!canvas || !originalImageDimensions) return;

            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();

            // Get mouse position relative to the visual canvas
            const displayX = e.clientX - rect.left;
            const displayY = e.clientY - rect.top;

            // Calculate the actual scale based on visual canvas size vs original image size
            const visualWidth = rect.width;
            const visualHeight = rect.height;
            const scaleX = originalImageDimensions.width / visualWidth;
            const scaleY = originalImageDimensions.height / visualHeight;

            // Transform coordinates from display space to canvas buffer space
            const canvasX = displayX * scaleX;
            const canvasY = displayY * scaleY;

            // Calculate brush size in canvas buffer space
            const brushRadius = BRUSH_SIZES[brushSize] * Math.min(scaleX, scaleY);

            // Draw white circular brush stroke at native resolution
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent white for better visibility
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, brushRadius, 0, 2 * Math.PI);
            ctx.fill();

            setHasDrawnMask(true);
        },
        [brushSize, originalImageDimensions]
    );

    // Mouse position tracking for custom cursor
    const updateMousePosition = useCallback(
        (e) => {
            if (!selectedImageUrl) return;
            const canvas = maskCanvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            setMousePosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        },
        [selectedImageUrl]
    );

    // Mouse event handlers for drawing
    const handleMouseDown = useCallback(
        (e) => {
            if (!selectedImageUrl) return;
            setIsDrawing(true);
            updateMousePosition(e);
            drawAtPoint(e);
        },
        [selectedImageUrl, updateMousePosition, drawAtPoint]
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (!selectedImageUrl) return;
            updateMousePosition(e);
            if (isDrawing) {
                drawAtPoint(e);
            }
        },
        [isDrawing, selectedImageUrl, updateMousePosition, drawAtPoint]
    );

    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const handleMouseEnter = useCallback(
        (e) => {
            if (selectedImageUrl) {
                updateMousePosition(e);
            }
        },
        [selectedImageUrl, updateMousePosition]
    );

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
    const handleGenerate = useCallback(async () => {
        if (!selectedImageUrl || !prompt.trim() || !hasDrawnMask || !imageSize) {
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

            // Call the inpainting generation function with scene asset type
            startInpainting(
                selectedImageUrl,
                maskBase64,
                prompt.trim(),
                3, // Generate 3 images
                imageSize, // Auto-detected size
                ASSET_TYPES.GENERATED_SCENE_IMAGES,
                null, // name
                null, // description
                sceneId
            );

            // Close modal on successful generation start
            onClose();
        } catch (error) {
            console.error('Scene inpainting generation failed:', error);
            setGenerationError(error.message || 'Failed to generate inpainted images');
            setIsGenerating(false);
        }
    }, [
        selectedImageUrl,
        hasDrawnMask,
        prompt,
        imageSize,
        getMaskAsBase64,
        startInpainting,
        onClose,
    ]);

    // Handle overlay click to close modal
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleCancel = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        Scene Image Inpainting
                    </h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.mainContent}>
                    {/* Three Column Layout */}
                    <div className={styles.threeColumnLayout}>
                        {/* Left Column - Image Preview */}
                        <div className={styles.leftColumn}>
                            <div className={styles.imagePreviewSection}>
                                <label className={styles.sectionLabel}>Selected Image:</label>
                                
                                {selectedImageUrl ? (
                                    <div className={styles.imagePreviewContainer}>
                                        <img
                                            src={selectedImageUrl}
                                            alt="Selected scene image"
                                            className={styles.previewImage}
                                        />
                                        {detectedOrientation && (
                                            <div className={styles.imageInfo}>
                                                <span className={styles.orientationBadge}>
                                                    {detectedOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                                                </span>
                                                {originalImageDimensions && (
                                                    <span className={styles.dimensionsBadge}>
                                                        {originalImageDimensions.width} × {originalImageDimensions.height}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.noImageContent}>
                                        <div className={styles.placeholderIcon}>🎨</div>
                                        <p className={styles.placeholderText}>No image selected</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Center Column - Canvas */}
                        <div className={styles.centerColumn}>
                            <div className={styles.canvasSection}>
                                <label className={styles.sectionLabel}>
                                    {selectedImageUrl
                                        ? 'Paint areas to inpaint (white areas will be replaced):'
                                        : 'Canvas (select an image to start editing):'}
                                </label>

                                {/* Canvas Container */}
                                <div
                                    className={
                                        detectedOrientation === 'landscape'
                                            ? styles.canvasLandscapeContainer
                                            : styles.canvasPortraitContainer
                                    }
                                >
                                    {/* Background canvas for image */}
                                    {selectedImageUrl && (
                                        <img className={styles.backgroundImage} src={selectedImageUrl} />
                                    )}

                                    {/* Mask canvas for drawing */}
                                    <canvas
                                        ref={maskCanvasRef}
                                        className={styles.maskCanvas}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeave}
                                    />

                                    {/* Custom brush cursor */}
                                    {selectedImageUrl && (
                                        <div
                                            className={styles.customCursor}
                                            style={{
                                                width: `${BRUSH_SIZES[brushSize] * 2}px`,
                                                height: `${BRUSH_SIZES[brushSize] * 2}px`,
                                                display: isDrawing || mousePosition ? 'block' : 'none',
                                                left: mousePosition
                                                    ? `${mousePosition.x - BRUSH_SIZES[brushSize]}px`
                                                    : '0px',
                                                top: mousePosition
                                                    ? `${mousePosition.y - BRUSH_SIZES[brushSize]}px`
                                                    : '0px',
                                            }}
                                        />
                                    )}

                                    {/* Empty state overlay */}
                                    {!selectedImageUrl && (
                                        <div className={styles.canvasEmptyState}>
                                            <div className={styles.emptyStateIcon}>🎨</div>
                                            <div className={styles.emptyStateText}>
                                                Image loading...
                                            </div>
                                        </div>
                                    )}
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
                                                    type='radio'
                                                    name='brushSize'
                                                    value={index}
                                                    checked={brushSize === index}
                                                    onChange={() => setBrushSize(index)}
                                                    disabled={!selectedImageUrl || isGenerating}
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

                                {/* Clear Mask Section */}
                                <div className={styles.clearMaskSection}>
                                    <button
                                        className={styles.clearMaskButton}
                                        onClick={clearMask}
                                        disabled={!hasDrawnMask || isGenerating}
                                    >
                                        Reset Mask
                                    </button>
                                </div>

                                {/* Generate Section */}
                                <div className={styles.generateSection}>
                                    <button
                                        className={styles.generateButton}
                                        onClick={handleGenerate}
                                        disabled={
                                            !selectedImageUrl ||
                                            !hasDrawnMask ||
                                            !prompt.trim() ||
                                            isGenerating
                                        }
                                    >
                                        {isGenerating ? 'Generating Images...' : 'Generate'}
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

            </div>
        </div>
    );
};

export default SceneInpaintingModal;
