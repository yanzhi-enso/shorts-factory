import openaiClient from '../services/oai.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptDir = path.resolve(__dirname, '../prompts/img2text.txt');
async function analysisImage(imageUrl, userInputText, promptId="img2text") {
    // Read the file content
    const promptPath = path.join(promptDir, `${promptId}.txt`);
    const promptContent = fs.readFileSync(promptPath, 'utf8');

    // Now you can use promptContent in your analysis
    const response = await openaiClient.analyzeImageWithOpenAI(
        [imageUrl], 
        userInputText, 
        {
            model: "o4-mini",
            instructions: promptContent
        } // Optional instructions
    );

    // Handle both success and error cases
    if (response.success) {
        return response.message;
    } else {
        throw new Error(response.message || 'Image analysis failed');
    }
}

export {
    analysisImage
}
