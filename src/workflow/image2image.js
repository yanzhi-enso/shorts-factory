import { openaiClient } from '../services/oai.js';
import { uploadBase64ToGCS } from 'utils/gcsUpload.js';
import { toFile } from 'openai';

/**
 * Extends images without using a mask (outpainting/extending image boundaries)
 * @param {string[]} imageURLs - Array of image URLs
 * @param {string} prompt - Description of the extension
 * @param {number} n - Number of variations to generate (default: 1)
 * @param {string} projectId - Project Id, used in gcs project folder path
 * @param {string} assetType - type (element, scene and etc) of the asset, used in gcs project folder path
 * @returns {Promise<Object>} Response data from OpenAI
 */
async function extendImage(imageURLs, prompt, n = 1, projectId, assetType) {
    try {
        // Convert URL array to File objects with sequential naming
        const imageFiles = await Promise.all(
            imageURLs.map((url, index) => 
                toFile(fetch(url), `image_${index + 1}.png`, {
                type: "image/png",
            }))
        );
        
        const response = await openaiClient.editImagesWithOpenAI(imageFiles, null, prompt, { n });
        if (response.success) {
            // Upload images to GCS and replace base64 with URLs
            const { images } = response.data;
            const ret = [];

            // Upload image results from OpenAI to GCS
            for (const imgData of images) {
                const uploadResult = await uploadBase64ToGCS(
                    imgData.imageBase64,
                    projectId,
                    assetType
                );


                if (uploadResult.success) {
                    ret.push({
                        imageUrl: uploadResult.gcsUrl,
                        revisedPrompt: imgData.revisedPrompt
                    });
                } else {
                    // do not break the loop if one image upload is failed
                    console.error("failed to oai result to gcs", ret.error)
                }
            }

            return ret;
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
 * @param {string} image_gcs_url - Single image URL
 * @param {string} mask - Base64 PNG string (data URL format with prefix)
 * @param {string} prompt - Description of the inpainting
 * @param {number} n - Number of variations to generate (default: 1)
 * @param {string} projectId - Project Id, used in gcs project folder path
 * @param {string} assetType - type (element, scene and etc) of the asset, used in gcs project folder path
 * @returns {Promise<Object>} Response data from OpenAI
 */
async function inpaintingImage(image_gcs_url, mask, prompt, n = 1, projectId, assetType) {
    try {
        // Convert URL to File object
        const imageFile = await toFile(fetch(image_gcs_url), 'image_1.png', { type: 'image/png' });

        // Convert base64 PNG to File object (mask comes as data URL with prefix)
        const base64Data = mask.replace(/^data:image\/png;base64,/, '');
        const maskBuffer = Buffer.from(base64Data, 'base64');
        const maskFile = await toFile(maskBuffer, 'mask.png', { type: 'image/png' });

        const response = await openaiClient.editImagesWithOpenAI([imageFile], maskFile, prompt, {
            n,
        });

        if (response.success) {
            const { images } = response.data;
            const ret = [];

            if (Array.isArray(images)) {
                // Handle multiple images from OpenAI response
                for (const imgData of images) {
                    const uploadResult = await uploadBase64ToGCS(
                        imgData.imageBase64,
                        projectId,
                        assetType
                    );

                    if (uploadResult.success) {
                        ret.push({
                            imageUrl: uploadResult.gcsUrl,
                            revisedPrompt: imgData.revisedPrompt,
                        });
                    } else {
                        // do not break the loop if one image upload is failed
                        console.error('failed to upload oai result to gcs:', uploadResult.error);
                    }
                }
            }
            return ret;
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
