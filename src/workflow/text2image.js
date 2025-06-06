import openaiClient, { MessagePayload } from '../services/oai.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.resolve(__dirname, '../prompts/img2text.txt');

async function analysisImage(
    imageUrl, storyContext, changeRequest, sceneDescription
) {
    // Read the file content
    const promptContent = fs.readFileSync(promptPath, 'utf8');

    const userInput = MessagePayload()

    if (storyContext) {
        userInput.addText(storyContext);
    }

    if (changeRequest) {
        userInput.addText(changeRequest);
    }

    if (sceneDescription) {
        userInput.addTextWithImage(sceneDescription, imageUrl);
    } else {
        userInput.addTextWithImage("This is the image", imageUrl);
    }

    // Now you can use promptContent in your analysis
    const response = await openaiClient.analyzeImageWithOpenAI(
        userInput, promptContent, "o4-mini",
    );

    // Handle both success and error cases
    if (response.success) {
        return response.message;
    } else {
        throw new Error(response.message || 'Image analysis failed');
    }
}

export const workflow = {
    analysisImage
}
