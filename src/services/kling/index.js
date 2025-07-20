// Server-side utilities for interacting with the Kling API
import { 
    KlingKeys, 
    keyPicker, 
    encodeTaskId, 
    decodeTaskId, 
    findKeyByAccessKey 
} from './keyManager.js';

const API_DOMAIN = 'https://api.klingai.com';

// Custom exception class for throttling errors
class KlingThrottleError extends Error {
    constructor(message) {
        super(message);
        this.name = 'KlingThrottleError';
    }
}

const TOKEN_EXPIRATION = parseInt(process.env.KLING_TOKEN_EXPIRATION || '1800', 10);

// Token generation for Kling API authentication
async function generateToken(keySet = null) {
    // Use provided keySet or pick the first available key
    const currentKey = keySet || (KlingKeys.length > 0 ? KlingKeys[0] : null);
    
    if (!currentKey) {
        throw new Error('No Kling API keys available');
    }

    const headers = {
        alg: 'HS256',
        typ: 'JWT',
    };

    const payload = {
        iss: currentKey.accessKey,
        exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION, // Valid for 30 minutes by default
        nbf: Math.floor(Date.now() / 1000) - 5, // Valid from 5 seconds ago
    };

    const base64url = (buffer) => {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };

    const encodedHeader = base64url(new TextEncoder().encode(JSON.stringify(headers)));
    const encodedPayload = base64url(new TextEncoder().encode(JSON.stringify(payload)));
    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(currentKey.secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));

    const encodedSignature = base64url(signature);

    return `${data}.${encodedSignature}`;
}

// Server-side utility to create a video from an image
async function createVideoOnKlingAPI(videoOptions) {
    let history = [];
    let lastThrottleError = null;
    const MAX_RETRIES = 5;
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
        const { key, history: updatedHistory } = keyPicker(history);
        history = updatedHistory;
        
        if (!key) {
            // All keys exhausted - throw the last throttling error
            throw new KlingThrottleError(
                lastThrottleError?.message || 'All API keys have reached their rate limits'
            );
        }
        
        try {
            const token = await generateToken(key);
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const response = await fetch(`${API_DOMAIN}/v1/videos/image2video`, {
                method: 'POST',
                headers,
                body: JSON.stringify(videoOptions),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.message || 'Unknown error';
                
                if (errorMessage.includes('parallel task over resource pack limit')) {
                    lastThrottleError = new Error(errorMessage);
                    retryCount++;
                    continue; // Try next key
                }
                
                throw new Error(`Kling API error: ${errorMessage}`);
            }

            // Encode the task ID with the accessKey before returning
            if (data && data.data && data.data.task_id) {
                data.data.task_id = encodeTaskId(data.data.task_id, key.accessKey);
            }

            return data; // Return the modified data with encoded task ID
            
        } catch (error) {
            if (error.message.includes('parallel task over resource pack limit')) {
                lastThrottleError = error;
                retryCount++;
                continue;
            }
            throw error;
        }
    }
    
    // If we exit the loop due to max retries, throw throttling error
    throw new KlingThrottleError(
        lastThrottleError?.message || `Maximum retry attempts (${MAX_RETRIES}) reached due to rate limiting`
    );
}

// Server-side utility to get account information
async function getAccountInfoFromKlingAPI(startTime, endTime, resourcePackName) {
    const params = new URLSearchParams();
    params.append('start_time', startTime);
    params.append('end_time', endTime);

    if (resourcePackName) {
        params.append('resource_pack_name', resourcePackName);
    }

    const headers = {
        Authorization: `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_DOMAIN}/account/costs?${params.toString()}`, {
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Kling API error: ${data.message || 'Unknown error'}`);
    }

    return data;
}

// Server-side utility to get task information
async function getTaskByIdFromKlingAPI(taskId) {
    // Decode the task ID to get original task ID and accessKey
    const { originalTaskId, accessKey } = decodeTaskId(taskId);
    
    // Find the appropriate key to use
    const keyToUse = findKeyByAccessKey(accessKey);
    
    if (!keyToUse) {
        throw new Error('No API keys available for this request');
    }

    const headers = {
        Authorization: `Bearer ${await generateToken(keyToUse)}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_DOMAIN}/v1/videos/image2video/${originalTaskId}`, {
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Kling API error (${response.status}): ${data.message || 'Unknown error'}`);
    }

    return data;
}

// Server-side utility to extend a video
async function extendVideoOnKlingAPI(videoId, extensionOptions = {}) {
    let history = [];
    let lastThrottleError = null;
    const MAX_RETRIES = 5;
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
        const { key, history: updatedHistory } = keyPicker(history);
        history = updatedHistory;
        
        if (!key) {
            // All keys exhausted - throw the last throttling error
            throw new KlingThrottleError(
                lastThrottleError?.message || 'All API keys have reached their rate limits'
            );
        }
        
        try {
            const token = await generateToken(key);
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const payload = {
                video_id: videoId,
                ...extensionOptions,
            };

            const response = await fetch(`${API_DOMAIN}/v1/videos/video-extend`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.message || 'Unknown error';
                
                if (errorMessage.includes('parallel task over resource pack limit')) {
                    lastThrottleError = new Error(errorMessage);
                    retryCount++;
                    continue; // Try next key
                }
                
                throw new Error(`Kling API error: ${errorMessage}`);
            }

            // Encode the task ID with the accessKey before returning
            if (data && data.data && data.data.task_id) {
                data.data.task_id = encodeTaskId(data.data.task_id, key.accessKey);
            }

            return data; // Return the modified data with encoded task ID
            
        } catch (error) {
            if (error.message.includes('parallel task over resource pack limit')) {
                lastThrottleError = error;
                retryCount++;
                continue;
            }
            throw error;
        }
    }
    
    // If we exit the loop due to max retries, throw throttling error
    throw new KlingThrottleError(
        lastThrottleError?.message || `Maximum retry attempts (${MAX_RETRIES}) reached due to rate limiting`
    );
}

// Server-side utility to get extension task information
async function getExtensionTaskByIdFromKlingAPI(taskId) {
    // Decode the task ID to get original task ID and accessKey
    const { originalTaskId, accessKey } = decodeTaskId(taskId);
    
    // Find the appropriate key to use
    const keyToUse = findKeyByAccessKey(accessKey);
    
    if (!keyToUse) {
        throw new Error('No API keys available for this request');
    }

    const headers = {
        Authorization: `Bearer ${await generateToken(keyToUse)}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_DOMAIN}/v1/videos/video-extend/${originalTaskId}`, {
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Kling API error (${response.status}): ${data.message || 'Unknown error'}`);
    }

    return data;
}

// Server-side utility to list extension tasks
async function listExtensionTasksFromKlingAPI(pageNum = 1, pageSize = 30) {
    const params = new URLSearchParams();
    params.append('pageNum', pageNum.toString());
    params.append('pageSize', pageSize.toString());

    const headers = {
        Authorization: `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_DOMAIN}/v1/videos/video-extend?${params.toString()}`, {
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Kling API error: ${data.message || 'Unknown error'}`);
    }

    return data;
}

// Export server-side utilities
export const klingClient = {
    generateToken,
    createVideoOnKlingAPI,
    getAccountInfoFromKlingAPI,
    getTaskByIdFromKlingAPI,
    extendVideoOnKlingAPI,
    getExtensionTaskByIdFromKlingAPI,
    listExtensionTasksFromKlingAPI,
    API_DOMAIN,
    TOKEN_EXPIRATION,
};

// Export the custom error class
export { KlingThrottleError };
