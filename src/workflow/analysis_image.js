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

const promptPath = path.resolve(__dirname, 'prompts/img2text.txt');
const videoPromptPath = path.resolve(__dirname, 'prompts/img2video.txt');

export async function analysisImageForImagePrompt(
    imageUrls,
    storyContext,
    globalChangeRequest,
    sceneDescription
) {
    // Read the file content into systemPrompt
    const systemPrompt = fs.readFileSync(promptPath, 'utf8');

    const userInput = new MessagePayload();

    if (storyContext) {
        userInput.addText('## Story Context:\n' + storyContext);
    }

    if (globalChangeRequest) {
        userInput.addText('## Global Change Request:\n' + globalChangeRequest);
    }

    if (sceneDescription) {
        userInput.addTextWithImage('## Scene Description:\n' + sceneDescription);
    }

    for (const index in imageUrls) {
        userInput.addTextWithImage(`Image ${parseInt(index) + 1}: ${imageUrls[index]}`);
    }

    // Now you can use promptContent in your analysis
    const response = await openaiClient.analyzeImageWithOpenAI(
        REASONING_MODELS.O3,
        systemPrompt,
        userInput
    );

    // Handle both success and error cases
    if (response.success) {
        return response.message;
    } else {
        throw new Error(response.message || 'Image analysis failed');
    }
}

export async function analyzeImageForVideoPrompt(
    imageUrl,
    sceneImagePrompt,
    storyContext,
    sceneDescription
) {
    // Read the video prompt file content into systemPrompt
    const systemPrompt = fs.readFileSync(videoPromptPath, 'utf8');

    const userInput = new MessagePayload();

    userInput.addText('## Scene Image Prompt:\n' + sceneImagePrompt);

    if (storyContext) {
        userInput.addText('## Story Context:\n' + storyContext);
    }

    if (sceneDescription) {
        userInput.addTextWithImage('## Scene Description:\n' + sceneDescription, imageUrl);
    } else {
        userInput.addTextWithImage(
            'Give an educated guess and create a prompt for this scene',
            imageUrl
        );
    }

    // Use video-specific prompting for Kling AI video generation
    const response = await openaiClient.analyzeImageWithOpenAI(
        REASONING_MODELS.O4_MINI,
        systemPrompt,
        userInput
    );

    // Handle both success and error cases
    if (response.success) {
        return response.message;
    } else {
        throw new Error(response.message || 'Video prompt analysis failed');
    }
}
