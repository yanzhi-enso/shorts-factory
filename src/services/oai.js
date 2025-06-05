// Server-side utilities for interacting with the OpenAI API using the SDK

import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default settings based on requirements
const DEFAULT_ANALYSIS_MODEL = "o4-mini";
const DEFAULT_GENERATION_MODEL = "gpt-image-1";
const DEFAULT_GENERATION_SIZE = "1024x1536"; // Portrait
const DEFAULT_QUALITY = "high";
const DEFAULT_DETAIL = "high";
const DEFAULT_OUTPUT_FORMAT = "png";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OpenAI API key is not set in environment variables.");
}

// Helper function to transform OpenAI SDK errors to our custom format
function transformError(error) {
  // Network-level errors
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_NODATA') {
    return { error: 'DNS_ERROR', message: 'Unable to resolve API endpoint' };
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return { error: 'NETWORK_ERROR', message: 'Network connection failed' };
  }

  if (error.name === 'AbortError') {
    return { error: 'CONNECTION_TIMEOUT', message: 'Request timed out' };
  }

  // OpenAI SDK-specific errors
  if (error instanceof OpenAI.AuthenticationError) {
    return { error: 'INVALID_API_KEY', message: 'OpenAI API key is invalid' };
  }

  if (error instanceof OpenAI.RateLimitError) {
    return { error: 'RATE_LIMIT_EXCEEDED', message: 'API rate limit exceeded' };
  }

  if (error instanceof OpenAI.BadRequestError) {
    return { error: 'INVALID_REQUEST', message: 'Request parameters are invalid' };
  }

  if (error instanceof OpenAI.PermissionDeniedError) {
    return { error: 'CONTENT_VIOLATION', message: 'Content violates OpenAI policies' };
  }

  if (error instanceof OpenAI.InternalServerError) {
    return { error: 'SERVER_ERROR', message: 'OpenAI server error' };
  }

  if (error instanceof OpenAI.APIError) {
    return { error: 'API_ERROR', message: `OpenAI API error: ${error.message}` };
  }

  return { error: 'UNKNOWN_ERROR', message: error?.message || 'An unknown error occurred' };
}

/**
 * Analyze one or multiple images using OpenAI Vision API
 * 
 * @param {string|string[]} images - Single image URL or array of image URLs
 * @param {string} prompt - Text prompt for analysis
 * @param {Object} [options={}] - Optional configuration
 * @param {string} [options.model] - Model override (default: o4-mini)
 * @param {Object} [options.responseFormat] - Response format configuration
 * @param {string} [options.instructions] - System instructions for the model
 * @param {string} [options.detail] - Image detail level (low/high/auto)
 * 
 * @returns {Promise<Object>} Analysis result with success/error status
 * 
 * @example
 * // Single image analysis
 * const result = await analyzeImageWithOpenAI(
 *   "https://example.com/image.jpg", 
 *   "Describe this image",
 *   { instructions: "You are an expert photographer" }
 * );
 * 
 * @example  
 * // Multiple image analysis
 * const result = await analyzeImageWithOpenAI(
 *   ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
 *   "Compare these images and describe the differences",
 *   { instructions: "Focus on differences in style and composition" }
 * );
 * 
 * @example
 * // Structured JSON response
 * const result = await analyzeImageWithOpenAI(
 *   "https://example.com/image.jpg",
 *   "Analyze this image",
 *   {
 *     instructions: "You are an expert art critic",
 *     responseFormat: {
 *       type: "json_schema",
 *       json_schema: {
 *         name: "image_analysis",
 *         schema: {
 *           type: "object",
 *           properties: {
 *             description: { type: "string" },
 *             mood: { type: "string" },
 *             objects: { type: "array", items: { type: "string" } }
 *           }
 *         }
 *       }
 *     }
 *   }
 * );
 */
async function analyzeImageWithOpenAI(images, prompt, options = {}) {
  try {
    // Normalize input - convert single image to array for consistent processing
    const imageArray = Array.isArray(images) ? images : [images];
    
    // Build content array with text prompt and images
    const content = [
      { type: "input_text", text: prompt }
    ];

    // Add each image as a separate content chunk
    imageArray.forEach(imageUrl => {
      content.push({ type: "input_image", image_url: imageUrl });
    });

    // Build payload with optional instructions
    const payload = {
      model: options.model || DEFAULT_ANALYSIS_MODEL,
      input: [
        {
          role: "user",
          content: content
        }
      ]
    };

    // Add optional parameters
    if (options.responseFormat) {
      payload.response_format = options.responseFormat;
    }
    
    if (options.instructions) {
      payload.instructions = options.instructions;
    }

    const response = await openai.responses.create(payload);

    // Simplified response format
    return {
      success: true,
      data: {
        id: response.id,
        description: response.output?.[0]?.content || '',
        analysis: response.output?.[0]?.content || null,
        usage: response.usage || null,
        model: response.model,
        imageCount: imageArray.length
      }
    };
  } catch (error) {
    const transformedError = transformError(error);
    return {
      success: false,
      error: transformedError.error,
      message: transformedError.message
    };
  }
}

// Server-side utility to generate images using OpenAI GPT-Image-1
async function generateImageWithOpenAI(prompt, options = {}) {
  try {
    const result = await openai.images.generate({
      prompt: prompt,
      model: options.model || DEFAULT_GENERATION_MODEL,
      size: options.size || DEFAULT_GENERATION_SIZE,
      quality: options.quality || DEFAULT_QUALITY,
      response_format: "b64_json", // Always return base64
      ...(options.user && { user: options.user })
    });

    // Simplified response format
    return {
      success: true,
      data: {
        imageBase64: result.data[0].b64_json,
        revisedPrompt: result.data[0].revised_prompt || prompt,
        format: DEFAULT_OUTPUT_FORMAT,
        created: result.created
      }
    };
  } catch (error) {
    const transformedError = transformError(error);
    return {
      success: false,
      error: transformedError.error,
      message: transformedError.message
    };
  }
}

// Server-side utility to edit images using OpenAI
async function editImageWithOpenAI(imageFile, maskFile, prompt, options = {}) {
  try {
    const editOptions = {
      image: imageFile,
      prompt: prompt,
      model: options.model || DEFAULT_GENERATION_MODEL,
      size: options.size || DEFAULT_GENERATION_SIZE,
      response_format: "b64_json",
      ...(options.user && { user: options.user })
    };

    // Add mask if provided
    if (maskFile) {
      editOptions.mask = maskFile;
    }

    const result = await openai.images.edit(editOptions);

    // Simplified response format
    return {
      success: true,
      data: {
        imageBase64: result.data[0].b64_json,
        revisedPrompt: result.data[0].revised_prompt || prompt,
        format: DEFAULT_OUTPUT_FORMAT,
        created: result.created
      }
    };
  } catch (error) {
    const transformedError = transformError(error);
    return {
      success: false,
      error: transformedError.error,
      message: transformedError.message
    };
  }
}

// Server-side utility to create image variations using OpenAI
async function createImageVariationWithOpenAI(imageFile, options = {}) {
  try {
    const result = await openai.images.createVariation({
      image: imageFile,
      model: options.model || DEFAULT_GENERATION_MODEL,
      size: options.size || DEFAULT_GENERATION_SIZE,
      response_format: "b64_json",
      ...(options.user && { user: options.user })
    });

    // Simplified response format
    return {
      success: true,
      data: {
        imageBase64: result.data[0].b64_json,
        revisedPrompt: 'Variation of provided image',
        format: DEFAULT_OUTPUT_FORMAT,
        created: result.created
      }
    };
  } catch (error) {
    const transformedError = transformError(error);
    return {
      success: false,
      error: transformedError.error,
      message: transformedError.message
    };
  }
}

// Helper utility to convert image URL to file object for editing/variations
async function imageUrlToFile(imageUrl, filename = 'image.png') {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a file-like object that the OpenAI SDK expects
    return new File([buffer], filename, { 
      type: response.headers.get('content-type') || 'image/png' 
    });
  } catch (error) {
    throw new Error(`Failed to convert image URL to file: ${error.message}`);
  }
}

// Convenience function to edit image from URL
async function editImageFromUrlWithOpenAI(imageUrl, maskUrl, prompt, options = {}) {
  try {
    const imageFile = await imageUrlToFile(imageUrl, 'image.png');
    const maskFile = maskUrl ? await imageUrlToFile(maskUrl, 'mask.png') : null;
    
    return await editImageWithOpenAI(imageFile, maskFile, prompt, options);
  } catch (error) {
    const transformedError = transformError(error);
    return {
      success: false,
      error: transformedError.error,
      message: transformedError.message
    };
  }
}

// Convenience function to create variations from URL
async function createImageVariationFromUrlWithOpenAI(imageUrl, options = {}) {
  try {
    const imageFile = await imageUrlToFile(imageUrl, 'image.png');
    
    return await createImageVariationWithOpenAI(imageFile, options);
  } catch (error) {
    const transformedError = transformError(error);
    return {
      success: false,
      error: transformedError.error,
      message: transformedError.message
    };
  }
}

// Export server-side utilities
export const openaiClient = {
  // Core functions
  analyzeImageWithOpenAI,
  generateImageWithOpenAI,
  editImageWithOpenAI,
  createImageVariationWithOpenAI,
  
  // URL convenience functions
  editImageFromUrlWithOpenAI,
  createImageVariationFromUrlWithOpenAI,
  
  // Helper utilities
  imageUrlToFile,
  transformError,
  
  // Configuration constants
  DEFAULT_ANALYSIS_MODEL,
  DEFAULT_GENERATION_MODEL,
  DEFAULT_GENERATION_SIZE,
  DEFAULT_QUALITY,
  DEFAULT_DETAIL,
  DEFAULT_OUTPUT_FORMAT
};
