// eventEmitter.js

// Imports the Google Cloud client library
import { PubSub } from '@google-cloud/pubsub';

// --- Configuration (can be moved to environment variables) ---
const projectId = 'pure-lantern-394915'; 
const topicName = 'playground-events';

// --- Singleton Pub/Sub Client ---
// Creates a client; caches it for further use.
const pubSubClient = new PubSub({ projectId });

/**
 * Logs a generated content event to the Pub/Sub topic.
 * @param {string} media_type - The type of media generated (e.g., 'image', 'text').
 * @param {string} user_id - The ID of the user associated with the event.
 * @param {object} input - A JavaScript object containing the input parameters (e.g., prompt). This will be stringified.
 * @param {string[]} output - An array of URLs for the media.
 */
export async function logGeneratedContent(media_type, user_id, project_id, input, output) {
    try {
        // --- Construct the Event Data to match the new schema ---
        const eventData = {
            media_type, // from function parameter
            user_id, // from function parameter
            project_id, // from function parameter
            // The 'input' field is stringified to be compatible with BigQuery's JSON type.
            input: JSON.stringify(input),
            // The 'output' field is a native array of strings for BigQuery's REPEATED type.
            output,
            // The 'created' timestamp is generated automatically.
            created: new Date().toISOString(),
            source: 'v2'
        };

        // Pub/Sub messages must be sent as a Buffer.
        const dataBuffer = Buffer.from(JSON.stringify(eventData));

        // Publishes the message
        const messageId = await pubSubClient.topic(topicName).publishMessage({ data: dataBuffer });
        console.log(`Message ${messageId} published for media_type: ${media_type}`);
        return messageId; // Return the ID on success
    } catch (error) {
        console.error(`[logGeneratedContent] Error publishing event: ${error.message}`);
        // Re-throw or handle the error as needed by the calling application.
        throw error;
    }
}