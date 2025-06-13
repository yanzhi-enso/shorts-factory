/**
 * Project validation utilities
 * Extracted from TabManager for reuse in ProjectManager HOC
 */

/**
 * Validates if a project exists by checking the file list API
 * @param {string} projectId - The project ID to validate
 * @returns {Promise<{isValid: boolean, files?: string[], error?: string}>}
 */
export async function validateProjectExists(projectId) {
    try {
        const response = await fetch(`/api/files/${projectId}`);
        
        if (response.ok) {
            const data = await response.json();
            return {
                isValid: true,
                files: data.files
            };
        } else {
            return {
                isValid: false,
                error: 'Project not found or has expired'
            };
        }
    } catch (err) {
        return {
            isValid: false,
            error: 'Failed to validate project'
        };
    }
}

/**
 * Determines which tabs should be unlocked based on the current stage
 * @param {string} stage - Current stage/tab
 * @returns {string[]} Array of unlocked tab names
 */
export function getUnlockedTabsForStage(stage) {
    // Define TABS constants locally to avoid import issues
    const TABS = {
        START: 'start',
        SCENES: 'scenes',
        REMAKE: 'remake',
        VIDEO: 'video'
    };
    
    switch (stage) {
        case TABS.START:
            return [TABS.START];
        case TABS.SCENES:
            return [TABS.START, TABS.SCENES];
        case TABS.REMAKE:
            return [TABS.START, TABS.SCENES, TABS.REMAKE];
        case TABS.VIDEO:
            return [TABS.START, TABS.SCENES, TABS.REMAKE, TABS.VIDEO];
        default:
            return [TABS.START];
    }
}
