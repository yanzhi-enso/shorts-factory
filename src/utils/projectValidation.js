/**
 * Project validation utilities
 * Extracted from TabManager for reuse in ProjectManager HOC
 */

// Stage progression order
const STAGE_ORDER = ['scenes', 'remake', 'video'];

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

/**
 * Compare two stages and determine if newStage is more advanced than currentStage
 * @param {string} currentStage - Current stage
 * @param {string} newStage - New stage to compare
 * @returns {boolean} True if newStage is more advanced
 */
export function isStageAdvancement(currentStage, newStage) {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const newIndex = STAGE_ORDER.indexOf(newStage);
    return newIndex > currentIndex;
}

/**
 * Get the status of a tab relative to the current stage
 * @param {string} tab - Tab to check
 * @param {string} activeTab - Currently active tab
 * @param {string} currentStage - Current project stage
 * @returns {string} 'active' | 'unlocked' | 'locked'
 */
export function getTabStatus(tab, activeTab, currentStage) {
    if (tab === activeTab) {
        return 'active';
    }
    
    const unlockedTabs = getUnlockedTabsForStage(currentStage);
    if (!unlockedTabs.includes(tab)) {
        return 'locked';
    }
    
    return 'unlocked';
}

/**
 * Get stage progression order for external use
 * @returns {string[]} Array of stages in progression order
 */
export function getStageOrder() {
    return [...STAGE_ORDER];
}
