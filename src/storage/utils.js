/**
 * Utility functions for storage operations
 */

/**
 * Parse scene information from GCS URL
 * Example: "https://storage.googleapis.com/.../project_id/video-Scene-1-1.jpg"
 * Returns: { sceneNumber: 1, imageOrder: 1 }
 */
export function parseSceneFromUrl(gcsUrl) {
    const match = gcsUrl.match(/video-Scene-(\d+)-(\d+)\./);
    if (match) {
        return {
            sceneNumber: parseInt(match[1], 10),
            imageOrder: parseInt(match[2], 10),
        };
    }
    return null;
}

/**
 * Calculate the next scene order based on positioning
 * @param {Object|null} beforeScene - Scene to insert after (null for first scene)
 * @param {Object|null} afterScene - Scene to insert before (null for append)
 * @returns {number} The calculated scene_order value
 * @throws {Error} If beforeScene is null but afterScene is provided (prepending not supported)
 * 
 * Valid combinations:
 * - beforeScene=null, afterScene=null: First scene when the list is empty
 * - beforeScene=null, afterScene=scene: First scene when the list is not empty
 * - beforeScene=scene, afterScene=null: Append after beforeScene
 * - beforeScene=scene, afterScene=scene: Insert between the two scenes
 * Invalid:
 */
export function getNextSceneOrder(beforeScene, afterScene) {
    // First scene in empty project
    if (beforeScene === null && afterScene === null) {
        return 100;
    }

    // Invalid scenario: prepending not supported
    if (beforeScene === null && afterScene !== null) {
        return afterScene.sceneOrder - 100;
    }

    // Append after existing scene
    if (beforeScene !== null && afterScene === null) {
        return beforeScene.sceneOrder + 100;
    }

    // Insert between two scenes
    if (beforeScene !== null && afterScene !== null) {
        const beforeOrder = beforeScene.sceneOrder;
        const afterOrder = afterScene.sceneOrder;
        
        // Validate that the scenes are in correct order
        if (beforeOrder >= afterOrder) {
            throw new Error('Invalid scene ordering: beforeScene must have a lower sceneOrder than afterScene');
        }
        
        return (beforeOrder + afterOrder) / 2;
    }

    // This should never be reached, but included for completeness
    throw new Error('Invalid scene ordering parameters');
}
