// Key management utilities for Kling API

const parseKlingKeys = () => {
    const keyString = process.env.KLING_KEYS || '';
    const keySets = keyString.split(',').map((set) => set.trim());
    return keySets.map((set) => {
        const [accessKey, secretKey] = set.split(':').map((key) => key.trim());
        return { accessKey, secretKey };
    });
};

const KlingKeys = parseKlingKeys();
if (!KlingKeys || KlingKeys.length === 0) {
    console.warn('Kling AI API keys are not set in environment variables.');
}

// Customized way to get the access key and secret key for kling API
// Kling has a very tight rate limit (4 concurrent requests) and monthly non-carryover quota.
// To avoid hitting the limit and try to use all the keys evenly, we implement this key picker to
// 1. randomly pick a key
// 2. if previous key hit the limit, allow it to try the next one
// 3. if all keys are used, return None
const keyPicker = (history) => {
    // step 1. check if history has all the possible keys
    // if so, return None, indicating no key available

    // step 2. create a list containing all the keys that are not in history
    // randomly pick one from the list
    // return the picked key and updated history
    const availableKeys = KlingKeys.filter((key) => !history.includes(key.accessKey));
    if (availableKeys.length === 0) {
        return { key: null, history };
    }

    const pickedKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    history.push(pickedKey.accessKey);
    console.log("key name:", pickedKey.accessKey)
    return { key: pickedKey, history };
};

// Encoding/decoding utilities for task IDs with accessKey information
function encodeTaskId(originalTaskId, accessKey) {
    const combined = `${originalTaskId}:${accessKey}`;
    return Buffer.from(combined).toString('base64');
}

function decodeTaskId(encodedTaskId) {
    try {
        const decoded = Buffer.from(encodedTaskId, 'base64').toString();
        
        // Check if it contains accessKey (new format)
        if (decoded.includes(':')) {
            const [originalTaskId, accessKey] = decoded.split(':');
            return { originalTaskId, accessKey };
        } else {
            // Backward compatibility: treat as plain task ID
            return { originalTaskId: decoded, accessKey: null };
        }
    } catch (error) {
        // If base64 decode fails, assume it's a plain task ID (backward compatibility)
        return { originalTaskId: encodedTaskId, accessKey: null };
    }
}

function findKeyByAccessKey(accessKey) {
    if (!accessKey) {
        // Backward compatibility: use first available key
        return KlingKeys.length > 0 ? KlingKeys[0] : null;
    }
    
    const key = KlingKeys.find(k => k.accessKey === accessKey);
    if (!key) {
        throw new Error(`API key not found: ${accessKey}. This video may have been created with a key that is no longer available.`);
    }
    return key;
}

export {
    KlingKeys,
    keyPicker,
    encodeTaskId,
    decodeTaskId,
    findKeyByAccessKey
};
