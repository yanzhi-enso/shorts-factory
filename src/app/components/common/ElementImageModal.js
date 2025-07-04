"use client";

import React, { useState, useEffect } from 'react';
import styles from './ElementImageModal.module.css';
import Image from 'next/image';
import { useProjectManager } from 'app/hocs/ProjectManager';

const ElementImageModal = ({ isOpen, elementImage, onClose }) => {
  const { updateElementImage, updateElementImageIndex } = useProjectManager();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  if (!isOpen || !elementImage) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const updates = {
        name: name.trim() || null,
        description: description.trim() || null
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
    try {
      await updateElementImageIndex(elementImage.id, selectedIndex);
    } catch (err) {
      console.error('Failed to update image selection:', err);
      setError('Failed to update image selection');
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        
        <div className={styles.imageContainer}>
          <Image
            src={elementImage.gcsUrls?.[elementImage.selectedImageIdx] || elementImage.gcsUrls?.[0]}
            alt={elementImage.name || 'Element image'}
            width={800}
            height={1400}
            className={styles.image}
          />
          
          {/* Show image selection controls if multiple images exist */}
          {elementImage.gcsUrls?.length > 1 && (
            <div className={styles.imageSelector}>
              <div className={styles.imageThumbnails}>
                {elementImage.gcsUrls.map((imageUrl, index) => (
                  <div
                    key={index}
                    className={`${styles.thumbnail} ${
                      index === elementImage.selectedImageIdx ? styles.selected : ''
                    }`}
                    onClick={() => handleImageSelect(index)}
                  >
                    <Image
                      src={imageUrl}
                      alt={`Variant ${index + 1}`}
                      width={60}
                      height={60}
                      className={styles.thumbnailImage}
                    />
                    <span className={styles.thumbnailLabel}>{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className={styles.selectorInfo}>
                {elementImage.selectedImageIdx + 1} of {elementImage.gcsUrls.length}
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.formContainer}>
          <div className={styles.formField}>
            <label htmlFor="name" className={styles.label}>Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter image name..."
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
          </div>
          
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
          
          <div className={styles.buttonContainer}>
            <button
              onClick={handleSave}
              disabled={isLoading}
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

export default ElementImageModal;
