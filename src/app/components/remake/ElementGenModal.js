"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FaUpload, FaImage, FaTimes } from 'react-icons/fa';
import { useProjectManager } from 'app/hocs/ProjectManager';
import { validateImageFile } from 'utils/client/upload';
import styles from './ElementGenModal.module.css';

const ElementGenModal = ({
    isOpen,
    onClose,
    onImageGenerated
}) => {
    const { projectState, handleElementImageUpload } = useProjectManager();
    
    const [activeTab, setActiveTab] = useState('prompt');
    
    // Upload tab state
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    
    // Shared metadata state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    
    const fileInputRef = useRef(null);

    // Handle file selection
    const handleFileSelect = useCallback((file) => {
        const validation = validateImageFile(file);
        
        if (!validation.valid) {
            setUploadError(validation.error);
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setUploadError(null);
    }, []);

    // Reset upload state
    const resetUploadState = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadError(null);
        setIsUploading(false);
        setIsDragOver(false);
        // Reset metadata fields
        setName('');
        setDescription('');
    }, [previewUrl]);

    // Drag and drop handlers
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]); // Only take first file
        }
    }, [handleFileSelect]);

    // File input click handler
    const handleFileInputClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // File input change handler
    const handleFileInputChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    }, [handleFileSelect]);

    // Main upload function using centralized upload logic
    const handleUpload = useCallback(async () => {
        if (!selectedFile || !projectState.curProjId) {
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            // Use centralized upload function from ProjectManager
            const result = await handleElementImageUpload(selectedFile, {
                name: name.trim() || null,
                description: description.trim() || null
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            // Success - trigger callback and close modal
            if (onImageGenerated) {
                onImageGenerated(result.elementImage);
            }

            resetUploadState();
            onClose();

        } catch (error) {
            console.error('Image upload failed:', error);
            setUploadError(error.message);
        } finally {
            setIsUploading(false);
        }
    }, [
        selectedFile,
        projectState.curProjId,
        handleElementImageUpload,
        name,
        description,
        onImageGenerated,
        resetUploadState,
        onClose
    ]);

    // Clear selected file
    const handleClearFile = useCallback(() => {
        resetUploadState();
    }, [resetUploadState]);

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
                        <div className={styles.uploadContainer}>
                            {!selectedFile ? (
                                <div
                                    className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={handleFileInputClick}
                                >
                                    <FaUpload className={styles.uploadIcon} />
                                    <h3 className={styles.dropZoneTitle}>
                                        {isDragOver ? 'Drop your image here' : 'Upload Image'}
                                    </h3>
                                    <p className={styles.dropZoneText}>
                                        Drag & drop an image or click to select
                                    </p>
                                    <p className={styles.dropZoneSubtext}>
                                        Supports PNG, JPEG, JPG, WebP • Max 25MB
                                    </p>
                                </div>
                            ) : (
                                <div className={styles.filePreview}>
                                    <div className={styles.previewHeader}>
                                        <h3 className={styles.previewTitle}>Image Preview</h3>
                                        <button
                                            className={styles.clearButton}
                                            onClick={handleClearFile}
                                            disabled={isUploading}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                    
                                    <div className={styles.previewImageContainer}>
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className={styles.previewImage}
                                        />
                                    </div>
                                    
                                    <div className={styles.fileInfo}>
                                        <div className={styles.fileName}>
                                            <FaImage className={styles.fileIcon} />
                                            {selectedFile.name}
                                        </div>
                                        <div className={styles.fileSize}>
                                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {uploadError && (
                                <div className={styles.errorMessage}>
                                    {uploadError}
                                </div>
                            )}
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={handleFileInputChange}
                                style={{ display: 'none' }}
                            />
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
                            disabled={isUploading}
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
                            disabled={isUploading}
                            rows={3}
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    {activeTab === 'upload' ? (
                        <button 
                            className={`${styles.actionButton} ${(!selectedFile || isUploading) ? styles.disabled : ''}`}
                            onClick={handleUpload}
                            disabled={!selectedFile || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <span className={styles.loadingSpinner}></span>
                                    Uploading...
                                </>
                            ) : (
                                'Upload'
                            )}
                        </button>
                    ) : (
                        <button className={styles.actionButton} disabled>
                            Coming Soon
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ElementGenModal;
