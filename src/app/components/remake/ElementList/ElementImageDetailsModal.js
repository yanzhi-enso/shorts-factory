"use client";

import React, { useState, useEffect } from 'react';
import styles from './ElementImageDetailsModal.module.css';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useElementGenModalContext } from '../ElementGenModal/ElementGenModalContext';
import EditButton from '../ElementGenModal/EditButton';
import InpaintingButton from '../ElementGenModal/InpaintingButton';
import DeleteButton from 'app/components/common/DeleteButton';
import { IMAGE_SIZE_PORTRAIT } from 'constants/image';

const ElementImageDetailsModal = ({ isOpen, elementImage, onClose }) => {
    const { updateElementImage, updateElementImageIndex, removeElementImage } = useProjectManager();
    const { openModal } = useElementGenModalContext();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [localSelectedImageIdx, setLocalSelectedImageIdx] = useState(0);

    // Initialize form fields when modal opens or element image changes
    useEffect(() => {
        if (isOpen && elementImage) {
            setName(elementImage.name || '');
            setDescription(elementImage.description || '');
            setError(null);
            setLocalSelectedImageIdx(elementImage.selectedImageIdx || 0);
        }
    }, [isOpen, elementImage]);

    // Handle escape key and body scroll lock
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

    if (!isOpen || !elementImage) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    const handleSave = async () => {
        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            // Update selected image index if changed
            if (localSelectedImageIdx !== elementImage.selectedImageIdx) {
                console.log('Updating selectedImageIdx to:', localSelectedImageIdx);
                await updateElementImageIndex(elementImage.id, localSelectedImageIdx);
            }

            // Update name and description
            const updates = {
                name: name.trim() || null,
                description: description.trim() || null,
            };

            const result = await updateElementImage(elementImage.id, updates);

            if (result.success) {
                onClose();
            } else {
                setError(result.error || 'Failed to save changes');
            }
        } catch (err) {
            console.error('Save failed:', err);
            setError('Failed to save changes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const handleVariantSelect = (variantIndex) => {
        setLocalSelectedImageIdx(variantIndex);
    };

    const handleDelete = async () => {
        if (isDeleting || isLoading) return;

        setIsDeleting(true);
        setError(null);

        try {
            const result = await removeElementImage(elementImage.id);

            if (result.success) {
                onClose();
            } else {
                setError(result.error || 'Failed to delete image');
            }
        } catch (err) {
            console.error('Delete failed:', err);
            setError('Failed to delete image');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = () => {
        // Extract generation sources if available
        const generationSources = elementImage.generationSources;

        // Create prefill data based on elementImage
        const prefillData = {
            initialTab: generationSources?.type === 'inpainting' ? 'inpainting' : 'prompt',
            prompt: generationSources?.prompt || '',
            srcImages: generationSources?.srcImages || [],
            maskImage: generationSources?.maskImage || null,
            size: generationSources?.size,
            sourceRecordId: elementImage.id,
        };

        // Open modal with prefill data
        openModal(prefillData);
        // Close current modal
        onClose();
    };

    const handleInpainting = () => {
        // Get current image URL using the current localSelectedImageIdx
        const currentImageUrl = elementImage.gcsUrls[localSelectedImageIdx];

        // Create minimal prefill data for fresh inpainting
        const prefillData = {
            initialTab: 'inpainting',
            srcImages: [{ url: currentImageUrl }],
            // Intentionally leave prompt and mask empty for fresh start
            prompt: '',
            mask: null,
            size: elementImage.generationSources?.size || IMAGE_SIZE_PORTRAIT,
            sourceRecordId: elementImage.id,
        };

        // Open modal with minimal prefill data
        openModal(prefillData);
        // Close current modal
        onClose();
    };

    const currentImageUrl = elementImage.gcsUrls?.[localSelectedImageIdx] || elementImage.gcsUrls?.[0];

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        Element Image Variants - {elementImage.name || 'Untitled'}
                    </h3>
                </div>

                <div className={styles.mainContent}>
                    {/* Left Column - Variant List */}
                    <div className={styles.leftColumn}>
                        <div className={styles.variantList}>
                            {elementImage.gcsUrls.map((imageUrl, index) => {
                                const isSelected = localSelectedImageIdx === index;

                                return (
                                    <div
                                        key={index}
                                        className={`${styles.variantItem} ${
                                            isSelected ? styles.selected : ''
                                        }`}
                                        onClick={() => handleVariantSelect(index)}
                                    >
                                        <div className={styles.variantThumbnail}>
                                            <img
                                                src={imageUrl}
                                                alt={`Variant ${index + 1}`}
                                                width={80}
                                                height={120}
                                                className={styles.variantImage}
                                            />
                                        </div>
                                        <div className={styles.variantInfo}>
                                            <div className={styles.variantLabel}>
                                                🎨 Variant #{index + 1}
                                            </div>
                                            <div className={styles.variantDate}>
                                                {new Date(elementImage.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column - Details */}
                    <div className={styles.rightColumn}>
                            {/* Image Viewer */}
                        <div className={styles.imageViewer}>
                            <div className={styles.mainImageContainer}>
                                <div className={styles.imageWrapper}>
                                    <img
                                        src={currentImageUrl}
                                        alt={elementImage.name || 'Element image'}
                                        className={styles.mainImage}
                                    />
                                    {/* Overlay buttons in 4 corners */}
                                    <div className={styles.imageOverlayButtons}>
                                        <EditButton
                                            onEdit={handleEdit}
                                            className={`${styles.overlayButton} ${styles.editButton}`}
                                            title='Edit'
                                        />
                                        <InpaintingButton
                                            onInpainting={handleInpainting}
                                            className={`${styles.overlayButton} ${styles.inpaintingButton}`}
                                            title='Inpainting'
                                        />
                                        <DeleteButton
                                            onDelete={handleDelete}
                                            className={`${styles.overlayButton} ${styles.overlayDeleteButton}`}
                                            title='Delete'
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Simplified Details Panel */}
                        <div className={styles.detailsPanel}>
                            <h4 className={styles.detailsTitle}>Details</h4>

                            <div className={styles.detailsSection}>
                                <label className={styles.detailsLabel}>Type:</label>
                                <div className={styles.detailsValue}>
                                    {elementImage.generationSources ? 'Generated' : 'Uploaded'}
                                </div>
                            </div>

                            <div className={styles.detailsSection}>
                                <label className={styles.detailsLabel}>Created:</label>
                                <div className={styles.detailsValue}>
                                    {new Date(elementImage.createdAt).toLocaleString()}
                                </div>
                            </div>

                            <div className={styles.detailsSection}>
                                <label className={styles.detailsLabel}>Variants:</label>
                                <div className={styles.detailsValue}>
                                    {elementImage.gcsUrls.length}
                                    {elementImage.gcsUrls.length > 1 && (
                                        <span className={styles.currentSelection}>
                                            {' '}
                                            (viewing {localSelectedImageIdx + 1})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
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
                        disabled={isLoading || isDeleting}
                    >
                        {isLoading ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ElementImageDetailsModal;
