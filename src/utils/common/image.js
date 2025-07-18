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
}

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
    return urls.map(url => ({url}));
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
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        onFilesDropped(imageFiles);
        return true; // Indicate successful drop
      }
      return false;
    }
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
};

export function base64ToBlob(base64, mimeType = 'image/png') {
    const byteString = atob(base64.split(',')[1]); // Remove data URL prefix
    const arrayBuffer = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        arrayBuffer[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeType });
}
