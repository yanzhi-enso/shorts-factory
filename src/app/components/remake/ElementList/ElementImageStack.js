"use client";

import { useState } from "react";
import Image from 'next/image';
import styles from './ElementImageStack.module.css';
import { useElementManager } from './ElementSelectionManager';

// ElementImageStack displays selected elements for current scene
// in its scene row as a horizontal stack
const ElementImageStack = ({ sceneId }) => {
    const { selectedElements, removeElementFromScene } = useElementManager();
    
    // Get elements for this scene
    const elements = selectedElements[sceneId] || [];
    
    // Handle remove element (no confirmation needed)
    const handleRemove = (elementUrl) => {
        removeElementFromScene(sceneId, elementUrl);
    };
    
    // Prevent focus loss when clicking remove button
    const handleMouseDown = (e) => {
        // Prevent the textarea from losing focus when clicking to remove elements
        e.preventDefault();
    };
    
    return (
        <div className={styles.container}>
            {elements.length === 0 ? (
                <div className={styles.placeholder}>
                    No elements selected for this scene
                </div>
            ) : (
                <>
                    {elements.map((elementUrl, index) => (
                        <div key={`${elementUrl}-${index}`} className={styles.thumbnail}>
                            <Image
                                src={elementUrl}
                                alt={`Element ${index + 1}`}
                                width={60}
                                height={60}
                                className={styles.image}
                            />
                            <button
                                className={styles.removeButton}
                                onClick={() => handleRemove(elementUrl)}
                                onMouseDown={handleMouseDown}
                                title="Remove element"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {elements.length >= 10 && (
                        <div className={styles.maxIndicator}>
                            Max reached (10/10)
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ElementImageStack;
