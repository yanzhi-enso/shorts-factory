/**
 * Project Manager Provider and Hook
 * Combines reducer, actions, and provides the React context
 */

import { createContext, useContext, useReducer } from 'react';
import { projectReducer } from './reducer';
import { initialState, PROJECT_ACTIONS } from './constants';
import { createProjectActions } from './actions';

// Create the context
const ProjectContext = createContext(undefined);

/**
 * Custom hook to use the project context
 */
export function useProjectManager() {
    const context = useContext(ProjectContext);
    
    if (context === undefined) {
        throw new Error('useProjectManager must be used within a ProjectProvider');
    }
    
    return context;
}

/**
 * Provider component that provides project management functionality
 */
export function ProjectProvider({ children }) {
    const [projectState, dispatch] = useReducer(projectReducer, initialState);
    
    // Create all action functions with dispatch and current state
    const actions = createProjectActions(dispatch, projectState);
    
    // Combine state, dispatch, and actions into the context value
    const value = {
        projectState,
        dispatch,
        ...actions
    };
    
    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// Export the context as well for advanced use cases
export { ProjectContext, PROJECT_ACTIONS };
