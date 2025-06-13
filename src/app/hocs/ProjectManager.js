'use client';

import React, { createContext, useContext, useReducer } from 'react';

// Initial state for the project manager
const initialState = {
    // Project state will be defined here later
};

// Action types - empty for now, to be extended later
const PROJECT_ACTIONS = {
    // Actions will be defined here later
};

// Reducer function - empty for now
function projectReducer(state, action) {
    switch (action.type) {
        default:
            return state;
    }
}

// Create the context
const ProjectContext = createContext(undefined);

// Custom hook to use the project context
export function useProjectManager() {
    const context = useContext(ProjectContext);
    
    if (context === undefined) {
        throw new Error('useProjectManager must be used within a ProjectProvider');
    }
    
    return context;
}

// Provider component
export function ProjectProvider({ children }) {
    const [state, dispatch] = useReducer(projectReducer, initialState);
    
    const value = {
        state,
        dispatch,
        // Additional methods can be added here later
    };
    
    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// Export the context as well for advanced use cases
export { ProjectContext };