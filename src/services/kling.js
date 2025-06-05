// Server-side utilities for interacting with the Kling API

const ACCESS_KEY = '460359edf9b343278c756ef876a15ca8';
const SECRET_KEY = '7cd846929ce545a99e9a44bd5d50eb0f';
const API_DOMAIN = "https://api.klingai.com";
// const API_DOMAIN = "https://api-singapore.klingai.com"
const TOKEN_EXPIRATION = parseInt(process.env.KLING_TOKEN_EXPIRATION || "1800", 10);

if (!ACCESS_KEY || !SECRET_KEY) {
  console.warn("Kling AI API keys are not set in environment variables.");
}

// Token generation for Kling API authentication
async function generateToken() {
    const headers = {
        alg: "HS256",
        typ: "JWT",
    };

    const payload = {
        iss: ACCESS_KEY,
        exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION, // Valid for 30 minutes by default
        nbf: Math.floor(Date.now() / 1000) - 5, // Valid from 5 seconds ago
    };

    const base64url = (buffer) => {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    const encodedHeader = base64url(new TextEncoder().encode(JSON.stringify(headers)));
    const encodedPayload = base64url(new TextEncoder().encode(JSON.stringify(payload)));
    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(SECRET_KEY),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(data)
    );

    const encodedSignature = base64url(signature);

    return `${data}.${encodedSignature}`;
}

// Server-side utility to create a video from an image
async function createVideoOnKlingAPI(videoOptions) {
    const headers = {
        'Authorization': `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${API_DOMAIN}/v1/videos/image2video`, {
        method: 'POST',
        headers,
        body: JSON.stringify(videoOptions)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Kling API error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
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
        'Authorization': `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${API_DOMAIN}/account/costs?${params.toString()}`, {
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Kling API error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Server-side utility to get task information
async function getTaskByIdFromKlingAPI(taskId) {
    const headers = {
        'Authorization': `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${API_DOMAIN}/v1/videos/image2video/${taskId}`, {
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Kling API error (${response.status}): ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Server-side utility to extend a video
async function extendVideoOnKlingAPI(videoId, extensionOptions = {}) {
    const headers = {
        'Authorization': `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json'
    };
    
    const payload = {
        video_id: videoId,
        ...extensionOptions
    };
    
    const response = await fetch(`${API_DOMAIN}/v1/videos/video-extend`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Kling API error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Server-side utility to get extension task information
async function getExtensionTaskByIdFromKlingAPI(taskId) {
    const headers = {
        'Authorization': `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${API_DOMAIN}/v1/videos/video-extend/${taskId}`, {
        headers
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
        'Authorization': `Bearer ${await generateToken()}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${API_DOMAIN}/v1/videos/video-extend?${params.toString()}`, {
        headers
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
    ACCESS_KEY,
    SECRET_KEY,
    API_DOMAIN,
    TOKEN_EXPIRATION
};
