import { logGeneratedContent } from "services/pubsub";

export const IMAGE_GEN_METHOD_TEXT = 'text'
export const IMAGE_GEN_METHOD_EXTEND = 'extend'
export const IMAGE_GEN_METHOD_INPAINTING = 'inpainting'

const VALID_IMAGE_GEN_METHODS = [
    IMAGE_GEN_METHOD_TEXT,
    IMAGE_GEN_METHOD_EXTEND,
    IMAGE_GEN_METHOD_INPAINTING
]

export const reportImageGeneration = (userId, projectId, method, input, gcsUrls) => {
    if (!VALID_IMAGE_GEN_METHODS.includes(method)) {
        console.error('Invalid method:', method);
        return;
    }

    // skip input image otherwise bigquery will be very slow
    input.images = null

    try {
        logGeneratedContent(
            'image',
            userId,
            projectId,
            {
                method,
                input,
            },
            gcsUrls
        );
    } catch (ex) {
        // reportImageGeneration will never throw exception
        // as this is only for analytics, which should not
        // block main logic.
        console.error('Failed to emit Message:', ex);
    }
};

export const reportVideoGeneration = (userId, projectId, input, videoUrl) => {
    try {
        logGeneratedContent('video', userId, projectId, input, [videoUrl]);
    } catch (ex) {
        // reportImageGeneration will never throw exception
        // as this is only for analytics, which should not
        // block main logic.
        console.error('Failed to emit Message:', ex);
    }
};