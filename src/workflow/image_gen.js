import { openaiClient } from 'services/oai.js';
import { uploadBase64ToGCS } from 'services/gcs.js';
import { base64ToBlob } from 'utils/common/image';
import { toFile } from 'openai';

/**
 * Generates images based on a text prompt.
 * @param {string} prompt - The text prompt to generate images from.
 * @param {string} size - The size of the generated images (e.g., "1024x1024").
 * @param {number} n - The number of images to generate (default: 1).
 * @returns {Promise<Object[]>} - An array of generated image objects.
 */
export async function generateImage(prompt, size, n = 1, project_id, asset_type) {
    // Call the OpenAI service to generate images
    const response = await openaiClient.generateImageWithOpenAI(prompt, { n, size });

    if (!response.success)
        throw new Error(response.message || 'Image generation failed');

    const processedImages = await Promise.all(response.data.images.map(async (img) => {
        const uploadResult = await uploadBase64ToGCS(
            img.imageBase64,
            project_id,
            asset_type
        );

        if (!uploadResult.success) {
            console.error('Failed to upload image to GCS:', uploadResult.error);
            return null;
        }

        return {
            imageUrl: uploadResult.gcsUrl,
            revisedPrompt: img.revisedPrompt
        };
    }));

    // Filter out any null results from failed uploads
    return processedImages.filter(image => image !== null);
}

/**
 * Extends images without using a mask (outpainting/extending image boundaries)
 * @param {object[]} srcImages - Array of objects that contains image URL or base64 strings to extend
 * @param {string} prompt - Description of the extension
 * @param {string} size - The size of the generated images (e.g., "1024x1024").
 * @param {number} n - Number of variations to generate (default: 1)
 * @param {string} projectId - Project Id, used in gcs project folder path
 * @param {string} assetType - type (element, scene and etc) of the asset, used in gcs project folder path
 * @returns {Promise<Object>} Response data from OpenAI
 */
export async function extendImage(srcImages, prompt, size, n = 1, projectId, assetType) {
    try {
        // Convert image object array to File objects with sequential naming
        const imageFiles = await Promise.all(
            srcImages.map(async (image, index) => {
                if (image.url) {
                    return toFile(fetch(image.url), `image_${index + 1}.png`, {
                        type: 'image/png',
                    });
                } else if (image.base64) {
                    const blob = base64ToBlob(image.base64)
                    return new File([blob], 'image.png', { type: 'image/png' });
                } else {
                    throw new Error("image object format is invalid, idx:", index);
                }
            })
        );

        const response = await openaiClient.editImagesWithOpenAI(imageFiles, null, prompt, {
            n,
            size,
        });
        if (!response.success) {
            throw new Error(response.message || 'Extend Image Failed');
        }

        // Upload images to GCS and replace base64 with URLs
        const processedImages = await Promise.all(
            response.data.images.map(async (img) => {
                const uploadResult = await uploadBase64ToGCS(img.imageBase64, projectId, assetType);

                if (!uploadResult.success) {
                    // do not break the loop if one image upload is failed
                    console.error('failed to oai result to gcs', uploadResult.error);
                    return null;
                }

                return {
                    imageUrl: uploadResult.gcsUrl,
                    revisedPrompt: img.revisedPrompt,
                };
            })
        );

        // Filter out any null results from failed uploads
        return processedImages.filter((image) => image !== null);
    } catch (error) {
        // Re-throw if it's already our custom error
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            throw error;
        }
        console.error("failed to extend image in the workflow:", error)
        throw new Error(`Image extension failed: ${error.message}`);
    }
}

/**
 * Performs image inpainting using a mask to fill/modify specific areas
 * @param {string} imageURL - Single input image URL
 * @param {string} mask - Base64 PNG string (data URL format with prefix)
 * @param {string} prompt - Description of the inpainting
 * @param {string} size - The size of the generated images (e.g., "1024x1024").
 * @param {number} n - Number of variations to generate (default: 1)
 * @param {string} projectId - Project Id, used in gcs project folder path
 * @param {string} assetType - type (element, scene and etc) of the asset, used in gcs project folder path
 * @returns {Promise<Object>} Response data from OpenAI
 */
export async function inpaintingImage(imageURL, mask, prompt, size, n = 1, projectId, assetType) {
    try {
        // Convert URL to File object
        const imageFile = await toFile(fetch(imageURL), 'image_1.png', { type: 'image/png' });

        // Convert base64 PNG to File object (mask comes as data URL with prefix)
        const base64Data = mask.replace(/^data:image\/png;base64,/, '');
        const maskBuffer = Buffer.from(base64Data, 'base64');
        const maskFile = await toFile(maskBuffer, 'mask.png', { type: 'image/png' });

        const response = await openaiClient.editImagesWithOpenAI([imageFile], maskFile, prompt, {
            n, size
        });

        if (!response.success) {
            throw new Error(response.message || 'Image Inpainting failed');
        }

        const processedImages = await Promise.all(response.data.images.map(async (img) => {
            const uploadResult = await uploadBase64ToGCS(
                img.imageBase64,
                projectId,
                assetType
            );

            if (!uploadResult.success) {
                console.error('failed to upload oai result to gcs:', uploadResult.error);
                return null;
            }

            return {
                imageUrl: uploadResult.gcsUrl,
                revisedPrompt: img.revisedPrompt,
            };
        }
        ));

        // Filter out any null results from failed uploads
        return processedImages.filter(image => image !== null);
    } catch (error) {
        // Re-throw if it's already our custom error
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            throw error;
        }
        throw new Error(`Image inpainting failed: ${error.message}`);
    }
}