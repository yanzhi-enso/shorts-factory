"use client";

import React, { useEffect, useState } from 'react';
import styles from './ImageGenerationModal.module.css';

const ImageGenerationModal = ({
    isOpen,
    onClose,
    onImageGenerated
}) => {
    const [activeTab, setActiveTab] = useState('prompt');

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
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
    }, [isOpen, onClose]);

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
                    <div className={styles.tabContent}>
                        <div className={styles.placeholder}>
                            <h3>Text-to-Image & Image Extension</h3>
                            <p>Text-to-image and image extension functionality coming soon...</p>
                            <p>This tab will support:</p>
                            <ul>
                                <li>Generate images from text prompts</li>
                                <li>Extend existing images with additional prompts</li>
                                <li>Multiple image generation options</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'inpainting':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.placeholder}>
                            <h3>Image Inpainting</h3>
                            <p>Image inpainting functionality coming soon...</p>
                            <p>This tab will support:</p>
                            <ul>
                                <li>Upload base images for editing</li>
                                <li>Create or upload masks for specific areas</li>
                                <li>Generate new content in masked areas</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'upload':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.placeholder}>
                            <h3>Local Image Upload</h3>
                            <p>Local image upload functionality coming soon...</p>
                            <p>This tab will support:</p>
                            <ul>
                                <li>Drag & drop image upload</li>
                                <li>File format validation and conversion</li>
                                <li>Direct integration with project storage</li>
                            </ul>
                        </div>
                    </div>
                );
            default:
                return null;
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

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    <button className={styles.actionButton} disabled>
                        Coming Soon
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerationModal;
