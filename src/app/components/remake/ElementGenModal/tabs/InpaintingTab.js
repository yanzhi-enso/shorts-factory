"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useImageGen } from 'imageGenManager/ImageGenProvider';
import styles from './InpaintingTab.module.css';

/*
 * ========================================================================
 * INPAINTING TAB - UI IMPLEMENTATION
 * ========================================================================
 * 
 * FEATURES IMPLEMENTED:
 * - Single element image selection (similar to PromptTab pattern)
 * - Always visible canvas area (512×768px) with empty state
 * - Dual canvas system (background image + mask overlay)
 * - Brush tools with 3 sizes (Small: 10px, Medium: 20px, Large: 40px)
 * - Mask creation with white areas for inpainting
 * - Clear mask functionality
 * - Prompt input for inpainting description
 * - Generate button (always 3 images, no dropdown)
 * - Responsive design following existing patterns
 * 
 * TODO - FUTURE INTEGRATION:
 * - Connect to ImageGenProvider.startInpaintingGeneration() function
 * - Generated images will be automatically assigned to selected element image's gcsUrls field
 * - Mask processing and resizing to original image dimensions
 * - Backend API integration with existing inpainting endpoint
 * - Error handling and loading states
 * 
 * ========================================================================
 */

const InpaintingTab = ({ 
    name, 
    description, 
    onImageGenerated, 
    onClose 
}) => {
    const { projectState } = useProjectManager();
    const { startInpaintingGeneration } = useImageGen(); // TODO: Function needs to be implemented
    
    // Canvas constants
    const CANVAS_WIDTH = 512;
    const CANVAS_HEIGHT = 768;
    const BRUSH_SIZES = [10, 20, 40]; // Small, Medium, Large (radius in pixels)
    
    // State management
    const [selectedImage, setSelectedImage] = useState(null); // Single selection
    const [brushSize, setBrushSize] = useState(1); // 0=Small, 1=Medium, 2=Large
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawnMask, setHasDrawnMask] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    
    // Canvas refs
    const backgroundCanvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const [canvasImage, setCanvasImage] = useState(null);
    const [originalImageDimensions, setOriginalImageDimensions] = useState(null);
    
    // Handle single image selection
    const handleImageSelection = useCallback((elementImage) => {
        setSelectedImage(elementImage);
        loadImageToCanvas(elementImage);
        // Clear any existing mask when switching images
        clearMask();
    }, []);
    
    // Load and display image on canvas
    const loadImageToCanvas = useCallback((elementImage) => {
        const imageUrl = elementImage.gcsUrls?.[elementImage.selectedImageIdx] || elementImage.gcsUrls?.[0];
        if (!imageUrl) return;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Store original dimensions for future mask processing
            setOriginalImageDimensions({ width: img.width, height: img.height });
            
            // Calculate scale to fit canvas while maintaining aspect ratio
            const scaleX = CANVAS_WIDTH / img.width;
            const scaleY = CANVAS_HEIGHT / img.height;
            const scale = Math.min(scaleX, scaleY);
            
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            // Center the image on canvas
            const offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
            const offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;
            
            // Draw to background canvas
            const canvas = backgroundCanvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                
                // Clear and draw centered image
                ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            }
            
            // Initialize mask canvas
            const maskCanvas = maskCanvasRef.current;
            if (maskCanvas) {
                const maskCtx = maskCanvas.getContext('2d');
                maskCanvas.width = CANVAS_WIDTH;
                maskCanvas.height = CANVAS_HEIGHT;
                maskCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
            
            setCanvasImage(img);
        };
        img.src = imageUrl;
    }, []);
    
    // Mouse event handlers for drawing
    const handleMouseDown = useCallback((e) => {
        if (!selectedImage) return;
        setIsDrawing(true);
        drawAtPoint(e);
    }, [selectedImage, brushSize]);
    
    const handleMouseMove = useCallback((e) => {
        if (!isDrawing || !selectedImage) return;
        drawAtPoint(e);
    }, [isDrawing, selectedImage, brushSize]);
    
    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
    }, []);
    
    // Draw mask at mouse position
    const drawAtPoint = useCallback((e) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Draw white circular brush stroke
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent white for better visibility
        ctx.beginPath();
        ctx.arc(x, y, BRUSH_SIZES[brushSize], 0, 2 * Math.PI);
        ctx.fill();
        
        setHasDrawnMask(true);
    }, [brushSize]);
    
    // Clear mask function
    const clearMask = useCallback(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        setHasDrawnMask(false);
    }, []);
    
    // Handle generation (UI only - no actual API call)
    const handleGenerate = useCallback(() => {
        if (!selectedImage || !hasDrawnMask || !prompt.trim()) {
            return;
        }
        
        // TODO: Implement actual generation logic
        // This will call startInpaintingGeneration with:
        // - selectedImage: Current selected element image
        // - maskData: Processed mask data (resized to original image dimensions)
        // - prompt: User's inpainting prompt
        // - numberOfImages: Always 3 (no dropdown)
        // - Generated images will be automatically added to selectedImage.gcsUrls
        
        setIsGenerating(true);
        setGenerationError(null);
        
        // Simulate generation delay for UI demonstration
        setTimeout(() => {
            setIsGenerating(false);
            console.log('TODO: Implement inpainting generation with:', {
                selectedImage: selectedImage.id,
                prompt: prompt.trim(),
                numberOfImages: 3,
                hasDrawnMask,
                originalImageDimensions
            });
        }, 2000);
        
    }, [selectedImage, hasDrawnMask, prompt, originalImageDimensions]);
    
    // Check if image is selected
    const isImageSelected = useCallback((elementImage) => {
        return selectedImage?.id === elementImage.id;
    }, [selectedImage]);
    
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
                            const currentImageUrl = elementImage.gcsUrls?.[elementImage.selectedImageIdx] || elementImage.gcsUrls?.[0];
                            const isSelected = isImageSelected(elementImage);
                            
                            return (
                                <div
                                    key={elementImage.id}
                                    className={`${styles.elementImageItem} ${isSelected ? styles.selected : ''}`}
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
                        ? "Paint areas to inpaint (white areas will be replaced):" 
                        : "Canvas (select an image above to start editing):"
                    }
                </label>
                
                {/* Canvas Container */}
                <div className={styles.canvasContainer}>
                    {/* Background canvas for image */}
                    <canvas
                        ref={backgroundCanvasRef}
                        className={styles.backgroundCanvas}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                    />
                    
                    {/* Mask canvas for drawing */}
                    <canvas
                        ref={maskCanvasRef}
                        className={styles.maskCanvas}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ 
                            cursor: selectedImage ? 'crosshair' : 'not-allowed',
                            pointerEvents: selectedImage ? 'auto' : 'none'
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
                                    className={`${styles.brushSizeButton} ${brushSize === index ? styles.active : ''}`}
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
                <label htmlFor="inpaintPrompt" className={styles.sectionLabel}>
                    Inpainting Prompt *
                </label>
                <textarea
                    id="inpaintPrompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to generate in the painted areas..."
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
                    {isGenerating ? 'Generating 3 Images...' : 'Generate 3 Images'}
                </button>
                
                {/* Info text about fixed number of images */}
                <div className={styles.generateInfo}>
                    This feature always generates 3 images per request
                </div>
            </div>

            {/* Error Message */}
            {generationError && (
                <div className={styles.errorMessage}>
                    {generationError}
                </div>
            )}
            
            {/* TODO Notice for Development */}
            <div className={styles.devNotice}>
                <strong>🚧 Development Note:</strong> UI implementation complete. 
                Generated images will be automatically assigned to the selected element image's gcsUrls field.
            </div>
        </div>
    );
};

export default InpaintingTab;
