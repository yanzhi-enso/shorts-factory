// Server-side utilities for interacting with the OpenAI API using the SDK

import OpenAI from "openai";
import dotenv from "dotenv";

export const REASONING_MODELS = {
    O4_MINI: "o4-mini",
    O3: "o3",
};

// Load environment variables if not already loaded
if (typeof process !== "undefined" && !process.env.OPENAI_API_KEY) {
    dotenv.config();
}

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(
                "OpenAI API key is not set in environment variables."
            );
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

// Default settings based on requirements
const DEFAULT_ANALYSIS_MODEL = REASONING_MODELS.O3;
const DEFAULT_GENERATION_MODEL = "gpt-image-1";
const DEFAULT_GENERATION_SIZE = "1024x1536"; // Portrait
const DEFAULT_QUALITY = "high";
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_MODERATION = "low";
const DEFAULT_N = 1;

// Helper function to transform OpenAI SDK errors to our custom format
function transformError(error) {
    // Network-level errors
    if (error.code === "ENOTFOUND" || error.code === "EAI_NODATA") {
        return {
            error: "DNS_ERROR",
            message: "Unable to resolve API endpoint",
        };
    }

    if (error.code === "ECONNREFUSED" || error.code === "ECONNRESET") {
        return { error: "NETWORK_ERROR", message: "Network connection failed" };
    }

    if (error.name === "AbortError") {
        return { error: "CONNECTION_TIMEOUT", message: "Request timed out" };
    }

    // OpenAI SDK-specific errors
    if (error instanceof OpenAI.AuthenticationError) {
        return {
            error: "INVALID_API_KEY",
            message: "OpenAI API key is invalid",
        };
    }

    if (error instanceof OpenAI.RateLimitError) {
        return {
            error: "RATE_LIMIT_EXCEEDED",
            message: "API rate limit exceeded",
        };
    }

    if (error instanceof OpenAI.BadRequestError) {
        if (error.error?.code === "moderation_blocked") {
            return {
                error: "CONTENT_MODERATION_BLOCKED",
                message: "Content blocked by OpenAI moderation",
            };
        } else {
            return {
                error: "INVALID_REQUEST",
                message: "Request parameters are invalid",
            };
        }
    }

    if (error instanceof OpenAI.PermissionDeniedError) {
        return {
            error: "CONTENT_VIOLATION",
            message: "Content violates OpenAI policies",
        };
    }

    if (error instanceof OpenAI.InternalServerError) {
        return { error: "SERVER_ERROR", message: "OpenAI server error" };
    }

    if (error instanceof OpenAI.APIError) {
        return {
            error: "API_ERROR",
            message: `OpenAI API error: ${error.message}`,
        };
    }

    return {
        error: "UNKNOWN_ERROR",
        message: error?.message || "An unknown error occurred",
    };
}

export class MessagePayload {
    constructor() {
        this.content = [];
    }

    addText(text, role) {
        this.content.push({
            role: role || "user",
            content: text,
        });
    }

    addTextWithImage(text, imageUrl, role) {
        this.content.push({
            role: role || "user",
            content: [
                {
                    type: "input_text",
                    text: text,
                },
                {
                    type: "input_image",
                    image_url: imageUrl,
                },
            ],
        });
    }

    output() {
        return this.content;
    }
}

async function analyzeImageWithOpenAI(
    model = DEFAULT_ANALYSIS_MODEL,
    instructions,
    userInput,
    options = {}
) {
    /**
    Analyzes an image using OpenAI reasoning models
    @param {string} model - The OpenAI model to use (default: "o4-mini")
    @param {string} instructions - Optional instructions for the model
    @param {MessagePayload} userInput - User input text to provide context
    @param {Object} options - Additional options
    @param {string} options.responseFormat - Optional response format
    
    @returns {Promise<Object>} - a promise of an object with success status and message
  **/
    try {
        // assert message payload is an instance of MessagePayload
        if (!(userInput instanceof MessagePayload)) {
            throw new Error('userInput must be an instance of MessagePayload');
        }

        const openaiClient = getOpenAIClient();

        // Build payload with optional instructions
        const payload = {
            model,
            instructions,
            input: userInput.output(),
        };

        // Add optional parameters
        if (options.responseFormat) {
            payload.response_format = options.responseFormat;
        }

        const response = await openaiClient.responses.create(payload);

        // Simplified response format
        return {
            success: true,
            message: response.output?.[1]?.content?.[0]?.text, // [0] is for reasoning
        };
    } catch (error) {
        const transformedError = transformError(error);
        return {
            success: false,
            error: transformedError.error,
            message: transformedError.message,
        };
    }
}

// Server-side utility to generate images using OpenAI GPT-Image-1
async function generateImageWithOpenAI(prompt, options = {}) {
    try {
        const openaiClient = getOpenAIClient();

        const generateOptions = {
            prompt: prompt,
            model: options.model || DEFAULT_GENERATION_MODEL,
            size: options.size || DEFAULT_GENERATION_SIZE,
            quality: options.quality || DEFAULT_QUALITY,
            output_format: 'png', // Always return base64
            n: options.n || DEFAULT_N,
            moderation: DEFAULT_MODERATION,
            ...(options.output_format && {
                output_format: options.output_format,
            }),
        };

        const result = await openaiClient.images.generate(generateOptions);

        // return is always an array even if n = 1
        const images = result.data.map((item) => ({
            imageBase64: item.b64_json,
            revisedPrompt: item.revised_prompt || prompt,
        }));

        return {
            success: true,
            data: {
                images: images,
                format: options.output_format || DEFAULT_OUTPUT_FORMAT,
                created: result.created,
            },
        };
    } catch (error) {
        const transformedError = transformError(error);
        return {
            success: false,
            error: transformedError.error,
            message: transformedError.message,
        };
    }
}

// Server-side utility to edit multiple images using OpenAI
// Assumes all images are PNG format File objects
async function editImagesWithOpenAI(image, mask, prompt, options = {}) {
    try {
        const openaiClient = getOpenAIClient();

        // Always pass the images array directly to OpenAI API
        const editOptions = {
            image,
            prompt,
            model: options.model || DEFAULT_GENERATION_MODEL,
            size: options.size || DEFAULT_GENERATION_SIZE,
            quality: options.quality || DEFAULT_QUALITY,
            output_format: 'png', // Always return base64
            n: options.n || DEFAULT_N,
            moderation: options.moderation || DEFAULT_MODERATION,
            ...(options.user && { user: options.user }),
        };

        // Add mask if provided
        if (mask) {
            editOptions.mask = mask;
        }

        const result = await openaiClient.images.edit(editOptions);

        // return is always an array even if n = 1
        const output_images = result.data.map((item) => ({
            imageBase64: item.b64_json,
            revisedPrompt: item.revised_prompt || prompt,
        }));

        return {
            success: true,
            data: {
                images: output_images,
                format: options.output_format || DEFAULT_OUTPUT_FORMAT,
                created: result.created,
            },
        };
    } catch (error) {
        console.error("oai error:", error)
        const transformedError = transformError(error);
        return {
            success: false,
            error: transformedError.error,
            message: transformedError.message,
        };
    }
}

// Export server-side utilities
export const openaiClient = {
    // Core functions
    analyzeImageWithOpenAI,
    generateImageWithOpenAI,
    editImagesWithOpenAI,

    // Helper utilities
    transformError,
};
