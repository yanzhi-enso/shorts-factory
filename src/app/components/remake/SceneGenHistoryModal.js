"use client";

import { useState, useEffect, useRef } from 'react';
import { FaUpload } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import styles from './SceneGenHistoryModal.module.css';
import SceneEditButton from './SceneEditButton';
import SceneInpaintingButton from './SceneInpaintingButton';

const SceneGenHistoryModal = ({ isOpen, scene, onClose, onEditFromHistory, onInpaintClick }) => {
    const fileInputRef = useRef(null);

    // Get project manager functions and state
    const { updateScene, updateGeneratedImageIndex, handleSceneImageUpload } = useProjectManager();

    // Get scene data from project state
    console.log('SceneGenHistoryModal - scene:', scene);
    const recreatedImages = scene?.generatedImages || [];
    console.log('SceneGenHistoryModal - recreatedImages:', recreatedImages);
    const selectedGeneratedImageId = scene?.selectedGeneratedImageId;
    console.log('SceneGenHistoryModal - selectedGeneratedImageId:', selectedGeneratedImageId);

    // Local state for modal interactions
    const [selectedRecordId, setSelectedRecordId] = useState(selectedGeneratedImageId);
    const [localSelectedImageIdx, setLocalSelectedImageIdx] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    // Update local state when props change
    useEffect(() => {
        if (selectedGeneratedImageId) {
            setSelectedRecordId(selectedGeneratedImageId);
            // Set initial image index based on the record's selectedImageIdx
            const selectedRecord = recreatedImages.find(
                (img) => img.id === selectedGeneratedImageId
            );
            if (selectedRecord) {
                setLocalSelectedImageIdx(selectedRecord.selectedImageIdx || 0);
            }
        } else if (recreatedImages.length > 0) {
            // If no selection but images exist, select first one
            setSelectedRecordId(recreatedImages[0].id);
            setLocalSelectedImageIdx(recreatedImages[0].selectedImageIdx || 0);
        }
    }, [selectedGeneratedImageId, recreatedImages]);

    if (!isOpen) return null;

    // Get current selected record
    const selectedRecord = recreatedImages.find((img) => img.id === selectedRecordId);
    const currentImageUrl =
        selectedRecord?.gcsUrls?.[localSelectedImageIdx] || selectedRecord?.gcsUrls?.[0];

    const handleRecordSelect = (recordId) => {
        setSelectedRecordId(recordId);
        const record = recreatedImages.find((img) => img.id === recordId);
        if (record) {
            setLocalSelectedImageIdx(record.selectedImageIdx || 0);
        }
    };

    const handleThumbnailClick = (imageIndex) => {
        setLocalSelectedImageIdx(imageIndex);
    };

    const handleSave = async () => {
        try {
            console.log('Saving changes for record:', selectedRecordId);
            // 1. Update scene's selected_generated_image_id if changed
            if (selectedRecordId !== selectedGeneratedImageId) {
                console.log('Updating selectedImageId to:', selectedRecordId);
                await updateScene(scene.id, {
                    selected_generated_image_id: selectedRecordId,
                });
            }

            // 2. Update selected_image_idx for the record if changed
            if (selectedRecord && localSelectedImageIdx !== selectedRecord.selectedImageIdx) {
                console.log('Updating selectedImageIdx to:', localSelectedImageIdx);
                await updateGeneratedImageIndex(scene.id, selectedRecordId, localSelectedImageIdx);
            }

            onClose();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save changes');
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const file = e.target.files?.[0];

        if (!file) return;

        if (!allowedTypes.includes(file.type)) {
            alert('Please select only PNG, JPEG, or WebP images');
            e.target.value = '';
            return;
        }

        setIsUploading(true);

        try {
            const result = await handleSceneImageUpload(scene.id, file);
            if (result.success) {
                // New image becomes selected
                setSelectedRecordId(result.generatedImage.id);
                setLocalSelectedImageIdx(0);
            } else {
                alert('Failed to upload image: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const handleEditClick = (editData) => {
        // Call the edit callback from SceneRow
        if (onEditFromHistory) {
            onEditFromHistory(editData);
        }
        // Close the modal
        onClose();
    };

    const handleInpaintClick = (inpaintingData) => {
        // Call parent's inpainting handler and close this modal
        if (onInpaintClick) {
            onInpaintClick(inpaintingData);
        }
        // Close this modal to show inpainting modal
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        Scene Image History - {scene?.title || `Scene ${scene?.sceneOrder || ''}`}
                    </h3>
                </div>

                <div className={styles.mainContent}>
                    {/* Left Column - Record List */}
                    <div className={styles.leftColumn}>
                        <div className={styles.recordList}>
                            {recreatedImages.map((record, index) => {
                                const isSelected = selectedRecordId === record.id;
                                const thumbnailUrl =
                                    record.gcsUrls?.[record.selectedImageIdx] ||
                                    record.gcsUrls?.[0];
                                const imageType = record.generationSources
                                    ? 'Generated'
                                    : 'Uploaded';

                                return (
                                    <div
                                        key={record.id}
                                        className={`${styles.recordItem} ${
                                            isSelected ? styles.selected : ''
                                        }`}
                                        onClick={() => handleRecordSelect(record.id)}
                                    >
                                        <div className={styles.recordThumbnail}>
                                            <img
                                                src={thumbnailUrl}
                                                alt={`${imageType} ${index + 1}`}
                                                width={80}
                                                height={120}
                                                className={styles.recordImage}
                                            />
                                        </div>
                                        <div className={styles.recordInfo}>
                                            <div className={styles.recordLabel}>
                                                {imageType === 'Uploaded'
                                                    ? '📁 Uploaded'
                                                    : '🎨 Generated'}{' '}
                                                #{index + 1}
                                            </div>
                                            {record.gcsUrls?.length > 1 && (
                                                <div className={styles.imageCount}>
                                                    {record.gcsUrls.length} images
                                                </div>
                                            )}
                                            <div className={styles.recordDate}>
                                                {formatDate(record.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Upload Button */}
                        <div
                            className={`${styles.uploadItem} ${
                                isUploading ? styles.uploading : ''
                            }`}
                            onClick={!isUploading ? handleUploadClick : undefined}
                        >
                            <div className={styles.uploadContent}>
                                <FaUpload className={styles.uploadIcon} />
                                <div className={styles.uploadText}>
                                    {isUploading ? 'Uploading...' : 'Upload New Image'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Details */}
                    <div className={styles.rightColumn}>
                        {selectedRecord ? (
                            <>
                                {/* Image Viewer */}
                                <div className={styles.imageViewer}>
                                    <div className={styles.mainImageContainer}>
                                        <div className={styles.imageWrapper}>
                                            <img
                                                src={currentImageUrl}
                                                alt='Selected image'
                                                width={400}
                                                height={600}
                                                className={styles.mainImage}
                                            />
                                            <SceneEditButton
                                                selectedRecord={selectedRecord}
                                                onEditFromHistory={handleEditClick}
                                                className={styles.imageEditButton}
                                                title='Edit this generation'
                                            />
                                            <SceneInpaintingButton
                                                selectedRecord={selectedRecord}
                                                onInpaintClick={handleInpaintClick}
                                                sceneId={scene.id}
                                                className={styles.imageInpaintButton}
                                                title='Inpaint this image'
                                            />
                                        </div>
                                    </div>

                                    {/* Thumbnail Row */}
                                    {selectedRecord.gcsUrls &&
                                        selectedRecord.gcsUrls.length > 1 && (
                                            <div className={styles.thumbnailRow}>
                                                {selectedRecord.gcsUrls.map((url, index) => (
                                                    <div
                                                        key={index}
                                                        className={`${styles.thumbnailItem} ${
                                                            index === localSelectedImageIdx
                                                                ? styles.thumbnailSelected
                                                                : ''
                                                        }`}
                                                        onClick={() => handleThumbnailClick(index)}
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Image ${index + 1}`}
                                                            width={60}
                                                            height={90}
                                                            className={styles.thumbnailImage}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>

                                {/* Metadata Panel */}
                                <div className={styles.metadataPanel}>
                                    <h4 className={styles.metadataTitle}>Details</h4>

                                    <div className={styles.metadataSection}>
                                        <label className={styles.metadataLabel}>Type:</label>
                                        <div className={styles.metadataValue}>
                                            {selectedRecord.generationSources
                                                ? 'Generated'
                                                : 'Uploaded'}
                                        </div>
                                    </div>

                                    <div className={styles.metadataSection}>
                                        <label className={styles.metadataLabel}>Created:</label>
                                        <div className={styles.metadataValue}>
                                            {formatDate(selectedRecord.createdAt)}
                                        </div>
                                    </div>

                                    <div className={styles.metadataSection}>
                                        <label className={styles.metadataLabel}>Images:</label>
                                        <div className={styles.metadataValue}>
                                            {selectedRecord.gcsUrls?.length || 1}
                                            {selectedRecord.gcsUrls?.length > 1 && (
                                                <span className={styles.currentSelection}>
                                                    {' '}
                                                    (viewing {localSelectedImageIdx + 1})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {selectedRecord.generationSources && (
                                        <div className={styles.metadataSection}>
                                            <label className={styles.metadataLabel}>
                                                Generation Sources:
                                            </label>
                                            <div className={styles.generationSourcesContainer}>
                                                {/* Prompt Row */}
                                                {selectedRecord.generationSources.prompt && (
                                                    <div className={styles.promptRow}>
                                                        <div className={styles.promptLabel}>
                                                            Prompt:
                                                        </div>
                                                        <div className={styles.promptText}>
                                                            {
                                                                selectedRecord.generationSources
                                                                    .prompt
                                                            }
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Source Images Carousel */}
                                                {selectedRecord.generationSources.srcImages
                                                    ?.length > 0 && (
                                                    <div className={styles.sourceImagesRow}>
                                                        <div className={styles.sourceImagesLabel}>
                                                            Source Images:
                                                        </div>
                                                        <div
                                                            className={styles.sourceImagesCarousel}
                                                        >
                                                            {selectedRecord.generationSources.srcImages.map(
                                                                (srcImg, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className={
                                                                            styles.sourceImageThumb
                                                                        }
                                                                    >
                                                                        <img
                                                                            src={
                                                                                srcImg.url ||
                                                                                `data:image/jpeg;base64,${srcImg.base64}`
                                                                            }
                                                                            alt={`Source image ${
                                                                                index + 1
                                                                            }`}
                                                                            width={60}
                                                                            height={90}
                                                                            className={
                                                                                styles.sourceImage
                                                                            }
                                                                        />
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={styles.placeholderContent}>
                                <div className={styles.placeholderIcon}>📸</div>
                                <p className={styles.placeholderText}>No images available</p>
                                <p className={styles.placeholderSubtext}>
                                    Generate or upload images to see them here
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Panel */}
                <div className={styles.actionPanel}>
                    <button className={styles.cancelButton} onClick={handleCancel}>
                        Cancel
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={!selectedRecord}
                    >
                        Save
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

export default SceneGenHistoryModal;
