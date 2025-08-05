"use client";

import React, { useEffect, useState } from 'react';
import { useElementGenModalContext } from './ElementGenModalContext';
import PromptTab from './tabs/PromptTab';
import InpaintingTab from './tabs/InpaintingTab';
import UploadTab from './tabs/UploadTab';
import MetadataTab from './tabs/MetadataTab';
import styles from './ElementGenModal.module.css';

const ElementGenModal = ({
    onImageGenerated
}) => {
    const [activeTab, setActiveTab] = useState('prompt');
    const [isMetadataMode, setIsMetadataMode] = useState(false);
    const [metadataContext, setMetadataContext] = useState(null);

    const { isOpen, prefillData, closeModal } = useElementGenModalContext()

    // Handle prefill data to set initial tab
    useEffect(() => {
        if (isOpen && prefillData?.initialTab) {
            setActiveTab(prefillData.initialTab);
        } else if (isOpen) {
            // Reset to default tab when opening without prefill data
            setActiveTab('prompt');
        }
    }, [isOpen, prefillData]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, closeModal]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    };

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
    };

    // Function to switch to metadata mode
    const switchToMetadataMode = (context) => {
        setMetadataContext(context);
        setIsMetadataMode(true);
    };

    // Function to handle metadata completion
    const handleMetadataComplete = () => {
        setIsMetadataMode(false);
        setMetadataContext(null);
        closeModal();
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'prompt':
                return (
                    <PromptTab 
                        onImageGenerated={onImageGenerated}
                        onClose={closeModal}
                        onSwitchToMetadata={switchToMetadataMode}
                        prefillData={prefillData}
                    />
                );
            case 'inpainting':
                return (
                    <InpaintingTab 
                        onImageGenerated={onImageGenerated}
                        onClose={closeModal}
                        onSwitchToMetadata={switchToMetadataMode}
                        prefillData={prefillData}
                    />
                );
            case 'upload':
                return (
                    <UploadTab 
                        onImageGenerated={onImageGenerated}
                        onClose={closeModal}
                        onSwitchToMetadata={switchToMetadataMode}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={closeModal}>
                    ×
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {isMetadataMode ? 'Add Metadata' : 'Generate Image'}
                    </h2>
                </div>

                {isMetadataMode ? (
                    // Metadata mode: show only MetadataTab
                    <div className={styles.content}>
                        <MetadataTab 
                            operationType={metadataContext?.operationType}
                            pendingGenerationId={metadataContext?.pendingGenerationId}
                            elementImageId={metadataContext?.elementImageId}
                            onComplete={handleMetadataComplete}
                        />
                    </div>
                ) : (
                    // Normal mode: show tabs and content
                    <>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default ElementGenModal;
