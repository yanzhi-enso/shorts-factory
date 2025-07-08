"use client";

import React, { useState, useCallback } from 'react';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useImageGen } from 'imageGenManager/ImageGenProvider';
import styles from './MetadataTab.module.css';

const MetadataTab = ({ 
    operationType, // 'generation' | 'upload'
    pendingGenerationId, // for generation flows
    elementImageId, // for upload flow
    onComplete // callback when metadata collection is complete
}) => {
    const { updateElementImage } = useProjectManager();
    const { updatePendingMetadata } = useImageGen();
    
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Handle save metadata
    const handleSave = useCallback(async () => {
        setIsProcessing(true);
        
        try {
            const metadata = {
                name: name.trim() || null,
                description: description.trim() || null,
                tags: tags.trim() || null
            };

            if (operationType === 'upload') {
                // For upload: immediately update the element image
                await updateElementImage(elementImageId, metadata);
            } else {
                // For generation: store in pending item
                updatePendingMetadata(pendingGenerationId, metadata);
            }

            // Complete metadata collection
            onComplete();
        } catch (error) {
            console.error('Failed to save metadata:', error);
            // Even if metadata save fails, we should complete the process
            onComplete();
        } finally {
            setIsProcessing(false);
        }
    }, [name, description, tags, operationType, elementImageId, pendingGenerationId, updateElementImage, updatePendingMetadata, onComplete]);

    // Handle skip metadata
    const handleSkip = useCallback(() => {
        // Complete without saving metadata
        onComplete();
    }, [onComplete]);

    return (
        <div className={styles.metadataContainer}>
            <div className={styles.header}>
                <h3 className={styles.title}>Add Metadata (Optional)</h3>
                <p className={styles.subtitle}>
                    Provide additional information for your image. All fields are optional.
                </p>
            </div>

            <div className={styles.formSection}>
                <div className={styles.inputGroup}>
                    <label htmlFor="name" className={styles.label}>
                        Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter a name for this image..."
                        className={styles.input}
                        disabled={isProcessing}
                        autoFocus
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="description" className={styles.label}>
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe this image..."
                        className={styles.textarea}
                        rows={3}
                        disabled={isProcessing}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="tags" className={styles.label}>
                        Tags
                    </label>
                    <input
                        id="tags"
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Enter tags separated by commas..."
                        className={styles.input}
                        disabled={isProcessing}
                    />
                </div>
            </div>

            <div className={styles.buttonSection}>
                <button
                    className={styles.skipButton}
                    onClick={handleSkip}
                    disabled={isProcessing}
                >
                    Skip
                </button>
                <button
                    className={styles.saveButton}
                    onClick={handleSave}
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
};

export default MetadataTab;
