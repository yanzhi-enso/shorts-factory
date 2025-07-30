"use client";

import React, { useEffect, useState } from 'react';
import styles from './StoryConfigModal.module.css';
import { IMAGE_SIZE_PORTRAIT, IMAGE_SIZE_LANDSCAPE } from 'constants/image';
import ToggleSwitch from './ToggleSwitch';

const StoryConfigModal = ({
    isOpen,
    storyDescription = '',
    imageMode = IMAGE_SIZE_PORTRAIT,
    originalVideoUrl = '',
    isAdvMode = false,
    onSave,
    onSkip,
    onClose
}) => {
    const [formData, setFormData] = useState({
        storyDescription: storyDescription,
        imageMode: imageMode,
        isAdvMode: isAdvMode
    });

    // Update form data when props change (for editing existing values)
    useEffect(() => {
        setFormData({
            storyDescription: storyDescription,
            imageMode: imageMode,
            isAdvMode: isAdvMode
        });
    }, [storyDescription, imageMode, isAdvMode]);

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

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    const handleSkip = () => {
        onSkip();
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>Story Configuration</h2>
                </div>

                <div className={styles.content}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>🔗 Original Video URL</label>
                        <p className={styles.fieldInfo}>
                            The original TikTok video URL used to create this project.
                        </p>
                        <input
                            type="text"
                            className={styles.readonlyInput}
                            value={originalVideoUrl}
                            readOnly
                            placeholder="No video URL available"
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>📖 Story Description</label>
                        <p className={styles.fieldInfo}>
                            Provide a brief description of your story to help the AI model
                            understand the context and recreate images more accurately. This is
                            optional - if left empty, the model will make its best guess, but
                            results may be less precise.
                        </p>
                        <textarea
                            className={styles.textarea}
                            value={formData.storyDescription}
                            onChange={(e) => handleInputChange('storyDescription', e.target.value)}
                            placeholder='Describe your story context here...'
                            rows={4}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>📐 Image Mode</label>
                        <p className={styles.fieldInfo}>
                            Choose the aspect ratio for generated images in this project.
                        </p>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    value={IMAGE_SIZE_PORTRAIT}
                                    checked={formData.imageMode === IMAGE_SIZE_PORTRAIT}
                                    onChange={(e) => handleInputChange('imageMode', e.target.value)}
                                />
                                Portrait (1024×1536)
                            </label>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    value={IMAGE_SIZE_LANDSCAPE}
                                    checked={formData.imageMode === IMAGE_SIZE_LANDSCAPE}
                                    onChange={(e) => handleInputChange('imageMode', e.target.value)}
                                />
                                Landscape (1536×1024)
                            </label>
                        </div>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>⚙️ Advanced Mode</label>
                        <p className={styles.fieldInfo}>
                            Enable advanced features and additional configuration options.
                        </p>
                        <ToggleSwitch
                            checked={formData.isAdvMode}
                            onChange={(e) => handleInputChange('isAdvMode', e.target.checked)}
                            variant="secondary"
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.skipButton} onClick={handleSkip}>
                        Skip
                    </button>
                    <button className={styles.saveButton} onClick={handleSave}>
                        Save & Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryConfigModal;
