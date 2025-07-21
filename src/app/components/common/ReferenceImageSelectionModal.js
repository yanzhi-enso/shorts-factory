"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { FaUpload } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import styles from './ReferenceImageSelectionModal.module.css';

const ReferenceImageSelectionModal = ({
  isOpen, 
  onClose, 
  scene,
  onSuccess
}) => {
  const { 
    updateScene, 
    handleReferenceImageUpload,
    removeScene
  } = useProjectManager();
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef(null);

  // Initialize state when modal opens
  React.useEffect(() => {
    console.log("isOpen or scene changed:", isOpen, scene)
    if (isOpen && scene) {
      // Find current selected image index
      const currentIndex = scene.sceneImages?.findIndex(
        imageObj => imageObj.gcsUrl === scene.selectedImage
      ) ?? -1;
      setSelectedImageIndex(currentIndex);
      setTitle(scene.title || '');
    }
  }, [isOpen, scene]);

  if (!isOpen || !scene) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageSelect = (index) => {
    setSelectedImageIndex(index);
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

    try {
      const result = await handleReferenceImageUpload(scene.id, file);
      if (result.success) {
        console.log('Image uploaded successfully');
        if (onSuccess) onSuccess();
      } else {
        alert(`Failed to upload image: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload image: ${error.message}`);
    }

    e.target.value = '';
  };

  const handleSave = async () => {
    try {
      // Build updates object
      const updates = {};
      
      // Add title if changed
      if (title !== scene.title) {
        updates.title = title;
      }

      // Add selected image if changed
      if (selectedImageIndex >= 0) {
        const selectedImage = scene.sceneImages[selectedImageIndex];
        if (selectedImage && selectedImage.gcsUrl !== scene.selectedImage) {
          updates.selected_image_id = selectedImage.id;
        }
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        const result = await updateScene(scene.id, updates);
        if (!result.success) {
          alert(`Failed to save changes: ${result.error}`);
          return;
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert(`Failed to save changes: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Are you sure you want to delete this scene?');
    if (!confirmed) return;

    try {
      const result = await removeScene(scene.id);
      if (result.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(`Failed to delete scene: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete scene: ${error.message}`);
    }
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Scene {scene.sceneOrder / 100} - Image Selection</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* Image Grid */}
          <div className={styles.imageGrid}>
            {/* Upload Button */}
            <div
              className={`${styles.imageContainer} ${styles.uploadContainer}`}
              onClick={handleUploadClick}
            >
              <div className={styles.uploadContent}>
                <FaUpload className={styles.uploadIcon} />
                <div className={styles.uploadText}>Upload Image</div>
              </div>
            </div>

            {/* Existing Scene Images */}
            {scene.sceneImages?.map((imageObj, index) => (
              <div 
                key={imageObj.id || index} 
                className={`${styles.imageContainer} ${selectedImageIndex === index ? styles.selected : ''}`}
                onClick={() => handleImageSelect(index)}
              >
                <Image
                  src={imageObj.gcsUrl}
                  alt={`Scene option ${index + 1}`}
                  width={150}
                  height={225}
                  className={styles.image}
                />
                {selectedImageIndex === index && (
                  <div className={styles.selectedIndicator}>✓</div>
                )}
              </div>
            ))}
          </div>

          {/* Title Input */}
          <div className={styles.inputSection}>
            <label className={styles.inputLabel}>Scene Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter scene title..."
              className={styles.titleInput}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className={styles.controls}>
          <button 
            className={`${styles.controlButton} ${styles.deleteButton}`}
            onClick={handleDelete}
          >
            Delete
          </button>
          <div className={styles.rightControls}>
            <button 
              className={`${styles.controlButton} ${styles.cancelButton}`}
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className={`${styles.controlButton} ${styles.saveButton}`}
              onClick={handleSave}
            >
              Save
            </button>
          </div>
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

export default ReferenceImageSelectionModal;
