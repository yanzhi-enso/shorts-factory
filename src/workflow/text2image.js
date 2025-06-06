import {
    openaiClient,
    MessagePayload,
    REASONING_MODELS,
} from 'services/oai.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.resolve(__dirname, '../prompts/img2text.txt');

async function analysisImage(
    imageUrl, storyContext, globalChangeRequest, sceneDescription
) {
    // Read the file content into systemPrompt
    const systemPrompt = fs.readFileSync(promptPath, 'utf8');

    const userInput = new MessagePayload()

    if (storyContext) {
        userInput.addText("## Story Context:\n" + storyContext);
    }

    if (globalChangeRequest) {
        userInput.addText("## Global Change Request:\n" + globalChangeRequest);
    }

    if (sceneDescription) {
        userInput.addTextWithImage(
            "## Scene Description:\n" + sceneDescription, imageUrl);
    } else {
        userInput.addTextWithImage("This is the image", imageUrl);
    }

    // Now you can use promptContent in your analysis
    const response = await openaiClient.analyzeImageWithOpenAI(
        REASONING_MODELS.O4_MINI, systemPrompt, userInput, 
    );

    // Handle both success and error cases
    if (response.success) {
        return response.message;
    } else {
        throw new Error(response.message || 'Image analysis failed');
    }
}

async function generateImage(prompt, n = 1) {
    // Call the OpenAI service to generate images
    const response = await openaiClient.generateImageWithOpenAI(prompt, { n });
    
    // Handle both success and error cases
    if (response.success) {
        return response.data;
    } else {
        if (response?.error !== 'CONTENT_MODERATION_BLOCKED') {
            throw new Error(response.message || 'Image generation failed');
        } else {
            throw new Error('CONTENT_MODERATION_BLOCKED');
        }
    }
}

export const workflow = {
    analysisImage,
    generateImage
}
