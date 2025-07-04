"use client";

import { useRef } from 'react';
import { FaUpload } from "react-icons/fa";
import styles from "./SceneGenHistoryModal.module.css";
import Image from "next/image";

const SceneGenHistoryModal = ({
    isOpen,
    sceneId,
    generatedImages = [],
    selectedGeneratedImageId = null,
    onClose,
    onSelectImage,
    onImageUpload,
}) => {
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleImageClick = (imageId) => {
        if (onSelectImage) {
            onSelectImage(imageId);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            if (!allowedTypes.includes(file.type)) {
                alert('Please select only PNG, JPEG, or WebP images');
                e.target.value = '';
                return;
            }

            // Pass the file directly to the parent handler
            onImageUpload(file);
        }
        // Reset the input so the same file can be selected again
        e.target.value = '';
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Image History - {sceneId}</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.imageGrid}>
                        {/* Existing images */}
                        {generatedImages.map((imageItem, index) => {
                            const isSelected = selectedGeneratedImageId === imageItem.id;
                            const imageType = imageItem.generationSources
                                ? 'Generated'
                                : 'Uploaded';

                            // Get current image URL from the multi-image structure
                            const currentImageUrl = imageItem.gcsUrls?.[imageItem.selectedImageIdx] || imageItem.gcsUrls?.[0];

                            return (
                                <div
                                    key={imageItem.id}
                                    className={`${styles.imageItem} ${
                                        isSelected ? styles.selected : ''
                                    }`}
                                    onClick={() => handleImageClick(imageItem.id)}
                                >
                                    <Image
                                        src={currentImageUrl}
                                        alt={`${imageType} ${index + 1}`}
                                        width={150}
                                        height={225}
                                        className={styles.image}
                                    />
                                    <div className={styles.imageLabel}>
                                        {imageType === 'Uploaded' ? '📁 Uploaded' : '🎨 Generated'}{' '}
                                        {index + 1}
                                        {imageItem.gcsUrls?.length > 1 && (
                                            <span className={styles.imageCount}>
                                                {' '}({imageItem.selectedImageIdx + 1}/{imageItem.gcsUrls.length})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Upload button - always visible as last item */}
                        <div
                            className={`${styles.imageItem} ${styles.uploadItem}`}
                            onClick={handleUploadClick}
                        >
                            <div className={styles.uploadContent}>
                                <FaUpload className={styles.uploadIcon} />
                                <div className={styles.uploadText}>Upload Image</div>
                            </div>
                        </div>
                    </div>

                    {/* Show empty state only when no images and no upload button would be confusing */}
                    {generatedImages.length === 0 && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📸</div>
                            <p className={styles.emptyText}>No images yet</p>
                            <p className={styles.emptySubtext}>
                                Generate images or upload your own to see them here
                            </p>
                        </div>
                    )}
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

export default SceneGenHistoryModal;
