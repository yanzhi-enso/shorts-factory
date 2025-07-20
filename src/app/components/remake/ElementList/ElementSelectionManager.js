"use client";

import React, { createContext, useContext, useState } from 'react';

// Create the context
const ElementSelectionContext = createContext(null);

// Provider component
export const ElementSelectionProvider = ({ children }) => {
    // State for focused scene ID
    const [focusedSceneId, setFocusedSceneId] = useState(null);
    
    // State for selected elements map: { sceneId: elementArray }
    // Note elementArray is a list of url, not the actual element object
    // this way, we can easily recover/edit an generated image with its
    // original inputs
    const [selectedElements, setSelectedElements] = useState({});

    // Method to focus a scene
    const focusScene = (sceneId) => {
        setFocusedSceneId(sceneId);
    };

    // Method to blur (clear focus)
    const blur = () => {
        setFocusedSceneId(null);
    };

    // Method to set/replace elements for a scene
    const setElements = (sceneId, elementList) => {
        setSelectedElements(prev => ({
            ...prev,
            [sceneId]: [...elementList] // Create a copy to avoid mutations
        }));
    };

    // Method to reset/clear elements for a scene
    const resetElements = (sceneId) => {
        setSelectedElements(prev => ({
            ...prev,
            [sceneId]: []
        }));
    };

    // Method to append a single element to a scene
    const appendElementToScene = (sceneId, element) => {
        setSelectedElements(prev => ({
            ...prev,
            [sceneId]: [...(prev[sceneId] || []), element]
        }));
    };

    const removeElementFromScene = (sceneId, dropElement) => {
        setSelectedElements(prev => ({
            ...prev,
            [sceneId]: prev[sceneId].filter((e) => e!=dropElement)
        }));
    }

    // Context value
    const contextValue = {
        // States
        focusedSceneId,
        selectedElements,
        
        // Methods
        focusScene,
        blur,
        setElements,
        resetElements,
        appendElementToScene,
        removeElementFromScene,
    };

    return (
        <ElementSelectionContext.Provider value={contextValue}>
            {children}
        </ElementSelectionContext.Provider>
    );
};

// Custom hook to use the context
export const useElementManager = () => {
    const context = useContext(ElementSelectionContext);
    
    if (context === null) {
        throw new Error('useElementManager must be used within an ElementSelectionProvider');
    }
    
    return context;
};

// Export the context for advanced use cases (optional)
export { ElementSelectionContext };
