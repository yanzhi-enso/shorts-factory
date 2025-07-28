"use client";

import React, { useState, useEffect } from 'react';
import styles from './ElementImageDetailsModal.module.css';
import Image from 'next/image';
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
    const [imgIdx, setImgIdx] = useState(0);

    // Initialize form fields when modal opens or element image changes
    useEffect(() => {
        if (isOpen && elementImage) {
            setName(elementImage.name || '');
            setDescription(elementImage.description || '');
            setError(null);
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

    useEffect(() => {
        if (elementImage && elementImage.selectedImageIdx != imgIdx) {
            setImgIdx(elementImage.selectedImageIdx);
        }
    }, [elementImage]);

    if (!isOpen || !elementImage) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSave = async () => {
        //[todo] save index img selection
        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        if (imgIdx != elementImage.selectedImageIdx) {
            try {
                await updateElementImageIndex(elementImage.id, imgIdx);
            } catch (err) {
                console.error('Failed to update image selection:', err);
                setError('Failed to update image selection');
            }
        }

        try {
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        }
    };

    const handleImageSelect = async (selectedIndex) => {
        // this only change the index in modal, not the persistent storage
        setImgIdx(selectedIndex);
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
        // Get current image URL using the current imgIdx
        const currentImageUrl = elementImage.gcsUrls[imgIdx];

        // Create minimal prefill data for fresh inpainting
        const prefillData = {
            initialTab: 'inpainting',
            srcImages: [{ url: currentImageUrl }],
            // Intentionally leave prompt and mask empty for fresh start
            prompt: '',
            mask: null,
            size: elementImage.generationSources?.size || IMAGE_SIZE_PORTRAIT, // Extract from generation sources or use default
            sourceRecordId: elementImage.id, // For reference only
        };

        // Open modal with minimal prefill data
        openModal(prefillData);
        // Close current modal
        onClose();
    };

    if (!elementImage) {
        return <></>;
    }

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>

                <div className={styles.imageContainer}>
                    <div className={styles.imageSelector}>
                        {elementImage.gcsUrls.map((imageUrl, index) => (
                            <div
                                key={index}
                                className={`${styles.thumbnail} ${
                                    index === imgIdx ? styles.selected : ''
                                }`}
                                onClick={() => handleImageSelect(index)}
                            >
                                <img
                                    src={imageUrl}
                                    alt={`Variant ${index + 1}`}
                                    width={60}
                                    height={60}
                                    className={styles.thumbnailImage}
                                />
                            </div>
                        ))}
                    </div>
                    <div className={styles.mainImageContainer}>
                        <img
                            src={elementImage.gcsUrls?.[imgIdx]}
                            alt={elementImage.name || 'Element image'}
                            className={styles.image}
                        />
                        {/* Overlay buttons */}
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

                <div className={styles.formContainer}>
                    {/*    <div className={styles.formField}>
                      <label htmlFor='name' className={styles.label}>
                          Name
                      </label>
                      <input
                          id='name'
                          type='text'
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder='Enter image name...'
                          className={styles.input}
                          disabled={isLoading}
                          onKeyDown={handleKeyDown}
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
              disabled={isLoading}
              rows={3}
              onKeyDown={handleKeyDown}
            />
          </div> */}

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.buttonContainer}>
                        <button
                            onClick={handleSave}
                            disabled={isLoading || isDeleting}
                            className={`${styles.saveButton} ${isLoading ? styles.loading : ''}`}
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElementImageDetailsModal;
