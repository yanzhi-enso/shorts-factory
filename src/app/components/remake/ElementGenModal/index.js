"use client";

import React, { useEffect, useState, useCallback } from 'react';
import PromptTab from './tabs/PromptTab';
import InpaintingTab from './tabs/InpaintingTab';
import UploadTab from './tabs/UploadTab';
import styles from './ElementGenModal.module.css';

const ElementGenModal = ({
    isOpen,
    onClose,
    onImageGenerated
}) => {
    const [activeTab, setActiveTab] = useState('prompt');
    
    // Shared metadata state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    
    // Upload state from UploadTab
    const [uploadState, setUploadState] = useState({
        hasFile: false,
        isUploading: false,
        canUpload: false,
        handleUpload: null
    });

    // Reset metadata when modal opens/closes
    const resetMetadata = useCallback(() => {
        setName('');
        setDescription('');
    }, []);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            resetMetadata();
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, resetMetadata]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'prompt':
                return (
                    <PromptTab 
                        name={name}
                        description={description}
                        onImageGenerated={onImageGenerated}
                        onClose={onClose}
                    />
                );
            case 'inpainting':
                return (
                    <InpaintingTab 
                        name={name}
                        description={description}
                        onImageGenerated={onImageGenerated}
                        onClose={onClose}
                    />
                );
            case 'upload':
                return (
                    <UploadTab 
                        name={name}
                        description={description}
                        onImageGenerated={onImageGenerated}
                        onClose={onClose}
                        onUploadStateChange={setUploadState}
                    />
                );
            default:
                return null;
        }
    };

    const getActionButton = () => {
        switch (activeTab) {
            case 'upload':
                return (
                    <button 
                        className={`${styles.actionButton} ${!uploadState.canUpload ? styles.disabled : ''}`}
                        onClick={uploadState.handleUpload}
                        disabled={!uploadState.canUpload}
                    >
                        {uploadState.isUploading ? (
                            <>
                                <span className={styles.loadingSpinner}></span>
                                Uploading...
                            </>
                        ) : (
                            'Upload'
                        )}
                    </button>
                );
            case 'prompt':
                // PromptTab manages its own buttons internally
                return null;
            case 'inpainting':
            default:
                return (
                    <button className={styles.actionButton} disabled>
                        Coming Soon
                    </button>
                );
        }
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>Generate Image</h2>
                </div>

                <div className={styles.tabNavigation}>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'prompt' ? styles.active : ''}`}
                        onClick={() => handleTabClick('prompt')}
                    >
                        Prompt
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'inpainting' ? styles.active : ''}`}
                        onClick={() => handleTabClick('inpainting')}
                    >
                        Inpainting
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'upload' ? styles.active : ''}`}
                        onClick={() => handleTabClick('upload')}
                    >
                        Upload
                    </button>
                </div>

                <div className={styles.content}>
                    {renderTabContent()}
                </div>

                {/* Shared metadata section */}
                <div className={styles.metadataSection}>
                    <div className={styles.formField}>
                        <label htmlFor="name" className={styles.label}>Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter image name..."
                            className={styles.input}
                            disabled={activeTab === 'upload' && uploadState.isUploading}
                        />
                    </div>
                    
                    <div className={styles.formField}>
                        <label htmlFor="description" className={styles.label}>Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description..."
                            className={styles.textarea}
                            disabled={activeTab === 'upload' && uploadState.isUploading}
                            rows={3}
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    {getActionButton() && getActionButton()}
                </div>
            </div>
        </div>
    );
};

export default ElementGenModal;
