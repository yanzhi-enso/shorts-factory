"use client";

import React, { useState, useRef } from 'react';
import { FaUpload, FaTimes } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import styles from './AddSceneModal.module.css';

const AddSceneModal = ({ isOpen, onClose, onSuccess }) => {
    const { addScene, handleReferenceImageUpload, projectState } = useProjectManager();
    
    const [title, setTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const fileInputRef = useRef(null);

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setTitle('');
            setSelectedFile(null);
            setPreviewUrl(null);
            setIsCreating(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isCreating) {
            onClose();
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const file = e.target.files?.[0];
        
        if (!file) return;

        if (!allowedTypes.includes(file.type)) {
            alert('Please select only PNG, JPEG, or WebP images');
            e.target.value = '';
            return;
        }

        setSelectedFile(file);
        
        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        
        e.target.value = '';
    };

    const handleRemoveImage = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleCreate = async () => {
        setIsCreating(true);
        
        try {
            // Get current scenes and find the last one to append after
            const scenes = projectState.scenes || [];
            const lastScene = scenes.length > 0 ? scenes[scenes.length - 1] : null;
            
            // Create the scene first - append to end by passing lastScene as beforeScene
            const sceneResult = await addScene(
                lastScene, // insertAfterScene - pass last scene to append to end
                null, // insertBeforeScene - null means no specific order constraint  
                { 
                    title: title.trim() || null,
                    isSelected: true
                },
                null // No reference image initially
            );

            if (!sceneResult.success) {
                alert(`Failed to create scene: ${sceneResult.error}`);
                return;
            }

            // If there's a reference image, upload it
            if (selectedFile && sceneResult.scene) {
                const uploadResult = await handleReferenceImageUpload(
                    sceneResult.scene.id, 
                    selectedFile
                );
                
                if (!uploadResult.success) {
                    // Scene was created but image upload failed
                    console.warn('Scene created but image upload failed:', uploadResult.error);
                    alert('Scene created successfully, but failed to upload reference image. You can add it later.');
                }
            }

            // Clean up preview URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            if (onSuccess) onSuccess();
            onClose();
            
        } catch (error) {
            console.error('Create scene error:', error);
            alert(`Failed to create scene: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCancel = () => {
        if (!isCreating) {
            // Clean up preview URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Create New Scene</h3>
                    <button 
                        className={styles.closeButton} 
                        onClick={handleCancel}
                        disabled={isCreating}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Scene Name Input */}
                    <div className={styles.inputSection}>
                        <label className={styles.inputLabel}>Scene Name (Optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter scene name..."
                            className={styles.nameInput}
                            disabled={isCreating}
                        />
                    </div>

                    {/* Reference Image Upload */}
                    <div className={styles.inputSection}>
                        <label className={styles.inputLabel}>Reference Image (Optional)</label>
                        
                        {previewUrl ? (
                            <div className={styles.imagePreview}>
                                <img 
                                    src={previewUrl} 
                                    alt="Preview" 
                                    className={styles.previewImage}
                                />
                                <button 
                                    className={styles.removeImageButton}
                                    onClick={handleRemoveImage}
                                    disabled={isCreating}
                                    title="Remove image"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        ) : (
                            <div
                                className={`${styles.uploadArea} ${isCreating ? styles.disabled : ''}`}
                                onClick={isCreating ? undefined : handleUploadClick}
                            >
                                <FaUpload className={styles.uploadIcon} />
                                <div className={styles.uploadText}>Click to upload image</div>
                                <div className={styles.uploadSubtext}>PNG, JPEG, or WebP</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Control Buttons */}
                <div className={styles.controls}>
                    <button 
                        className={`${styles.controlButton} ${styles.cancelButton}`}
                        onClick={handleCancel}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button 
                        className={`${styles.controlButton} ${styles.createButton}`}
                        onClick={handleCreate}
                        disabled={isCreating}
                    >
                        {isCreating ? 'Creating...' : 'Create Scene'}
                    </button>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/png,image/jpeg,image/jpg,image/webp'
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default AddSceneModal;
