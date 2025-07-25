export const IMAGE_CONSTRAINTS = {
    MIN_DIMENSION: 768,
    MAX_DIMENSION: 2048,
    MAX_FILE_SIZE_MB: 50,
    MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
};

/**
 * Converts an image file to the Base64 format required by Video Engine API
 * @param {string} dataUrl - The data URL string from FileReader (e.target.result)
 * @returns {string} - Clean Base64 string without the data URL prefix
 */
export const convertImageToBase64 = (dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        console.error('Invalid data URL format');
        return null;
    }

    // Extract the Base64 string without the prefix
    // Format is typically: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...
    const base64String = dataUrl.split(',')[1];

    if (!base64String) {
        console.error('Failed to extract Base64 string from data URL');
        return null;
    }

    return base64String;
};

/**
 * Validate file size
 * @param {File} file - The file to validate
 * @param {number} maxSizeInMB - Maximum file size in MB
 * @returns {string|null} - Error message or null if valid
 */
export const validateFileSize = (file, maxSizeInMB = IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB) => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return `Image file is too large (${fileSizeMB} MB). Maximum file size is ${maxSizeInMB}MB`;
    }
    return null;
};

/**
 * Extract URL from srcImage object (handles both url and base64)
 * @param {Object} srcImage - Source image object with url or base64 property
 * @returns {string|null} - The URL or base64 string, or null if not found
 */
export const getSrcImageUrl = (srcImage) => {
    if (!srcImage) return null;
    return srcImage.url || srcImage.base64 || null;
};

/**
 * Check if srcImages array has content
 * @param {Array} srcImages - Array of source image objects
 * @returns {boolean} - True if array exists and has content
 */
export const hasSrcImages = (srcImages) => {
    return srcImages && Array.isArray(srcImages) && srcImages.length > 0;
};

/**
 * Convert URL array to srcImages format (for backward compatibility)
 * @param {Array<string>} urls - Array of URL strings
 * @returns {Array<Object>} - Array of {url: string} objects
 */
export const urlsToSrcImages = (urls) => {
    if (!urls || !Array.isArray(urls)) return [];
    return urls.map((url) => ({ url }));
};

/**
 * Extract all URLs from srcImages array
 * @param {Array} srcImages - Array of source image objects
 * @returns {Array<string>} - Array of URL/base64 strings
 */
export const srcImagesToUrls = (srcImages) => {
    if (!hasSrcImages(srcImages)) return [];
    return srcImages.map(getSrcImageUrl).filter(Boolean);
};

/**
 * Get the first source image URL from srcImages array
 * @param {Array} srcImages - Array of source image objects
 * @returns {string|null} - First URL/base64 string or null
 */
export const getFirstSrcImageUrl = (srcImages) => {
    if (!hasSrcImages(srcImages)) return null;
    return getSrcImageUrl(srcImages[0]);
};

/**
 * Convert any image file to PNG format using Canvas
 */
export const convertImageToPng = (file, quality = 1.0) => {
    return new Promise((resolve, reject) => {
        // Validate input
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('Invalid image file'));
            return;
        }

        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            try {
                // Set canvas dimensions to match image
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                // Draw image to canvas
                ctx.drawImage(img, 0, 0);

                // Convert to PNG blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // Clean up object URL
                            URL.revokeObjectURL(img.src);
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to convert image to PNG'));
                        }
                    },
                    'image/png',
                    quality
                );
            } catch (error) {
                reject(new Error(`Canvas error: ${error.message}`));
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };

        // Create object URL and load image
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Convert image with optional resizing
 */
export const convertAndResizeImage = (file, maxWidth = null, maxHeight = null, quality = 1.0) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            let { width, height } = img;

            // Calculate new dimensions if max sizes provided
            if (maxWidth && width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            if (maxHeight && height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(resolve, 'image/png', quality);
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Process image file and convert to data URL
 * @param {File} file - The image file to process
 * @returns {Promise<string>} - Promise that resolves to data URL
 */
export const processImageFile = (file) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('Invalid image file'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Process clipboard paste event and extract image files
 * @param {ClipboardEvent} event - The paste event
 * @param {Function} onFileProcessed - Callback function to handle each file
 * @returns {boolean} - True if image files were found and processed
 */
export const processClipboardPaste = (event, onFileProcessed) => {
    const items = event.clipboardData?.items;
    if (!items) return false;

    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                onFileProcessed(file);
                foundImage = true;
            }
        }
    }
    return foundImage;
};

/**
 * Create drag and drop event handlers
 * @param {Function} onFilesDropped - Callback function to handle dropped files
 * @param {boolean} disabled - Whether drag and drop is disabled
 * @returns {Object} - Object containing drag event handlers
 */
export const createDragHandlers = (onFilesDropped, disabled = false) => {
    return {
        handleDragEnter: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
                return true; // Indicate drag over state should be set
            }
            return false;
        },

        handleDragLeave: (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only set dragOver to false if we're leaving the drop zone entirely
            if (!e.currentTarget.contains(e.relatedTarget)) {
                return true; // Indicate drag over state should be cleared
            }
            return false;
        },

        handleDragOver: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
                return true; // Indicate drag over state should be set
            }
            return false;
        },

        handleDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (disabled) return false;

            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter((file) => file.type.startsWith('image/'));

            if (imageFiles.length > 0) {
                onFilesDropped(imageFiles);
                return true; // Indicate successful drop
            }
            return false;
        },
    };
};

/**
 * Convert OpenAI required mask format to display format
 * @param {Function} openaiMaskBase64 - openAI mask in Base64 format
 * This function is mainly to recover inpainting input in inpainting tab
 */
export function convertOpenAIMaskToDisplayFormat(openaiMaskBase64) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Create temporary canvas to process the mask
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw the OpenAI mask
            tempCtx.drawImage(img, 0, 0);

            // Get image data
            const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;

            // Convert from OpenAI format to display format
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];

                if (alpha === 0) {
                    // OpenAI transparent (was painted) -> Display white with full opacity
                    data[i] = 255; // R
                    data[i + 1] = 255; // G
                    data[i + 2] = 255; // B
                    data[i + 3] = 255; // A (full opacity = 1.0 * 255 = 255)
                } else {
                    // OpenAI opaque (was not painted) -> Display transparent
                    data[i] = 0; // R
                    data[i + 1] = 0; // G
                    data[i + 2] = 0; // B
                    data[i + 3] = 0; // A (transparent)
                }
            }

            // Put the converted data back
            tempCtx.putImageData(imageData, 0, 0);

            // Return as base64
            resolve(tempCanvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = openaiMaskBase64;
    });
}

export function base64ToBlob(base64, mimeType = 'image/png') {
    const byteString = atob(base64.split(',')[1]); // Remove data URL prefix
    const arrayBuffer = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        arrayBuffer[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeType });
}

/**
 * Main function to validate and optionally resize an image file
 * @param {File} file - The image file to process
 * @returns {Promise} - Promise resolving to processed file data or rejecting with error message
 */
export const validateAndResizeImage = async (file) => {
    try {
        // Step 1: Validate file size
        const fileSizeError = validateFileSize(file);
        if (fileSizeError) {
            throw new Error(fileSizeError);
        }

        // Step 2: Load image to get dimensions
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Failed to load image'));
            image.src = URL.createObjectURL(file);
        });

        // Step 3: Calculate optimal dimensions
        const dimensionResult = calculateOptimalDimensions(img.naturalWidth, img.naturalHeight);

        if (dimensionResult.error) {
            URL.revokeObjectURL(img.src);
            throw new Error(dimensionResult.error);
        }

        // Step 4: If no resize needed, return original file as blob
        if (!dimensionResult.needsResize) {
            URL.revokeObjectURL(img.src);
            // Convert to blob to maintain consistent return type
            const blob = await new Promise((resolve, reject) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/png', 0.9);
            });

            return {
                blob,
                dimensions: { width: img.naturalWidth, height: img.naturalHeight },
                needsResize: false,
                originalSize: file.size,
                finalSize: blob.size,
            };
        }

        // Step 5: Resize image with quality adjustment
        const resizeResult = await resizeImageWithQualityAdjustment(
            file,
            dimensionResult.width,
            dimensionResult.height
        );

        URL.revokeObjectURL(img.src);

        return {
            blob: resizeResult.blob,
            dimensions: resizeResult.finalDimensions,
            needsResize: true,
            originalSize: file.size,
            finalSize: resizeResult.fileSize,
            quality: resizeResult.quality,
            originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

export const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        console.log('type of input blob', typeof blob);
        reader.readAsDataURL(blob);
    });
};

/**
 * Calculate optimal dimensions within constraints while maintaining aspect ratio
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @param {Object} constraints - Dimension constraints
 * @returns {Object} - {width, height, needsResize, error}
 */
export const calculateOptimalDimensions = (
    originalWidth,
    originalHeight,
    constraints = IMAGE_CONSTRAINTS
) => {
    const { MIN_DIMENSION, MAX_DIMENSION } = constraints;

    // Check if already within bounds
    if (
        originalWidth >= MIN_DIMENSION &&
        originalWidth <= MAX_DIMENSION &&
        originalHeight >= MIN_DIMENSION &&
        originalHeight <= MAX_DIMENSION
    ) {
        return {
            width: originalWidth,
            height: originalHeight,
            needsResize: false,
            error: null,
        };
    }

    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    // Handle oversized images - scale down
    if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
        if (originalWidth > originalHeight) {
            newWidth = MAX_DIMENSION;
            newHeight = Math.round(MAX_DIMENSION / aspectRatio);
        } else {
            newHeight = MAX_DIMENSION;
            newWidth = Math.round(MAX_DIMENSION * aspectRatio);
        }
    }

    // Handle undersized images - scale up
    if (newWidth < MIN_DIMENSION || newHeight < MIN_DIMENSION) {
        if (newWidth < newHeight) {
            newWidth = MIN_DIMENSION;
            newHeight = Math.round(MIN_DIMENSION / aspectRatio);
        } else {
            newHeight = MIN_DIMENSION;
            newWidth = Math.round(MIN_DIMENSION * aspectRatio);
        }
    }

    // Check if the calculated dimensions are still valid
    if (
        newWidth < MIN_DIMENSION ||
        newWidth > MAX_DIMENSION ||
        newHeight < MIN_DIMENSION ||
        newHeight > MAX_DIMENSION
    ) {
        // Calculate aspect ratio limits
        const maxAspectRatio = MAX_DIMENSION / MIN_DIMENSION;
        const minAspectRatio = MIN_DIMENSION / MAX_DIMENSION;

        if (aspectRatio > maxAspectRatio) {
            return {
                width: originalWidth,
                height: originalHeight,
                needsResize: false,
                error: `Image is too wide. Maximum supported aspect ratio is ${maxAspectRatio.toFixed(
                    1
                )}:1`,
            };
        } else if (aspectRatio < minAspectRatio) {
            return {
                width: originalWidth,
                height: originalHeight,
                needsResize: false,
                error: `Image is too tall. Minimum supported aspect ratio is 1:${(
                    1 / minAspectRatio
                ).toFixed(1)}`,
            };
        }
    }

    return {
        width: newWidth,
        height: newHeight,
        needsResize: true,
        error: null,
    };
};

/**
 * Resize image with quality adjustment to meet file size constraints
 * @param {File} file - Original image file
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @param {number} maxFileSize - Maximum file size in bytes
 * @returns {Promise} - Promise resolving to {blob, finalDimensions} or rejecting with error
 */
export const resizeImageWithQualityAdjustment = (
    file,
    targetWidth,
    targetHeight,
    maxFileSize = IMAGE_CONSTRAINTS.MAX_FILE_SIZE_BYTES
) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = async () => {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // Try different quality levels if file size estimation suggests it might be too large
            const estimatedSize = estimatePngSize(targetWidth, targetHeight, 0.9);
            let qualityLevels = [0.9];

            if (estimatedSize > maxFileSize) {
                qualityLevels = [0.8, 0.7, 0.6, 0.5, 0.4];
            }

            // Try each quality level
            for (const quality of qualityLevels) {
                try {
                    const blob = await new Promise((resolveBlob, rejectBlob) => {
                        canvas.toBlob(
                            (result) => {
                                if (result) {
                                    resolveBlob(result);
                                } else {
                                    rejectBlob(new Error('Failed to create blob'));
                                }
                            },
                            'image/png',
                            quality
                        );
                    });

                    if (blob.size <= maxFileSize) {
                        URL.revokeObjectURL(img.src);
                        resolve({
                            blob,
                            finalDimensions: { width: targetWidth, height: targetHeight },
                            quality,
                            fileSize: blob.size,
                        });
                        return;
                    }
                } catch (error) {
                    console.warn(`Failed to create blob at quality ${quality}:`, error);
                }
            }

            // If we get here, even the lowest quality is too large
            URL.revokeObjectURL(img.src);
            const fileSizeMB = (
                estimatePngSize(targetWidth, targetHeight, 0.4) /
                (1024 * 1024)
            ).toFixed(1);
            reject(
                new Error(
                    `Resized image would be too large (estimated ${fileSizeMB} MB). Try a smaller source image.`
                )
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image for resizing'));
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Estimate PNG file size based on dimensions and quality
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} quality - Quality factor (0-1)
 * @returns {number} - Estimated file size in bytes
 */
export const estimatePngSize = (width, height, quality = 0.9) => {
    // PNG estimation: roughly 3-4 bytes per pixel for typical images
    // Quality affects compression efficiency
    return Math.round(width * height * 3.5 * quality);
};
