import { openaiClient } from '../services/oai.js';
import { toFile } from 'openai';

/**
 * Extends images without using a mask (outpainting/extending image boundaries)
 * @param {string[]} images - Array of image URLs
 * @param {string} prompt - Description of the extension
 * @param {number} n - Number of variations to generate (default: 1)
 * @returns {Promise<Object>} Response data from OpenAI
 */
async function extendImage(images, prompt, n = 1) {
    try {
        // Convert URL array to File objects with sequential naming
        const imageFiles = await Promise.all(
            images.map((url, index) => 
                toFile(fetch(url), `image_${index + 1}.png`)
            )
        );
        
        const response = await openaiClient.editImagesWithOpenAI(imageFiles, null, prompt, { n });
        
        if (response.success) {
            return response.data;
        } else {
            if (response?.error !== 'CONTENT_MODERATION_BLOCKED') {
                throw new Error(response.message || 'Image extension failed');
            } else {
                throw new Error('CONTENT_MODERATION_BLOCKED');
            }
        }
    } catch (error) {
        // Re-throw if it's already our custom error
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            throw error;
        }
        throw new Error(`Image extension failed: ${error.message}`);
    }
}

/**
 * Performs image inpainting using a mask to fill/modify specific areas
 * @param {string} image - Single image URL
 * @param {string} mask - Base64 PNG string (without data URL prefix)
 * @param {string} prompt - Description of the inpainting
 * @param {number} n - Number of variations to generate (default: 1)
 * @returns {Promise<Object>} Response data from OpenAI
 */
async function inpaintingImage(image, mask, prompt, n = 1) {
    try {
        // Convert URL to File object
        const imageFile = await toFile(fetch(image), 'image_1.png');
        
        // Convert base64 PNG to File object (mask is pure base64 without URL prefix)
        const maskBuffer = Buffer.from(mask, 'base64');
        const maskFile = await toFile(maskBuffer, 'mask.png');
        
        const response = await openaiClient.editImagesWithOpenAI([imageFile], maskFile, prompt, { n });
        
        if (response.success) {
            return response.data;
        } else {
            if (response?.error !== 'CONTENT_MODERATION_BLOCKED') {
                throw new Error(response.message || 'Image inpainting failed');
            } else {
                throw new Error('CONTENT_MODERATION_BLOCKED');
            }
        }
    } catch (error) {
        // Re-throw if it's already our custom error
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            throw error;
        }
        throw new Error(`Image inpainting failed: ${error.message}`);
    }
}

export const workflow = {
    extendImage,
    inpaintingImage
}
