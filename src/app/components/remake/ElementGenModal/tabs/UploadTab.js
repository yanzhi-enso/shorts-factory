"use client";

import React, { useState, useCallback, useRef } from 'react';
import { FaUpload, FaImage, FaTimes } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import { validateImageFile } from 'utils/client/upload';
import styles from './UploadTab.module.css';

const UploadTab = ({ 
    name, 
    description, 
    onImageGenerated, 
    onClose,
    onUploadStateChange 
}) => {
    const { projectState, handleElementImageUpload } = useProjectManager();
    
    // Upload tab state
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    
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
    }, [previewUrl]);

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
            console.log('result from upload tab:', result);

            if (!result.success) {
                console.error('upload error:', result.error);
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

    // Notify parent about upload state changes
    React.useEffect(() => {
        if (onUploadStateChange) {
            onUploadStateChange({
                hasFile: !!selectedFile,
                isUploading,
                canUpload: !!selectedFile && !isUploading,
                handleUpload
            });
        }
    }, [selectedFile, isUploading, onUploadStateChange, handleUpload]);

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

    // Clear selected file
    const handleClearFile = useCallback(() => {
        resetUploadState();
    }, [resetUploadState]);

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
};

export default UploadTab;
