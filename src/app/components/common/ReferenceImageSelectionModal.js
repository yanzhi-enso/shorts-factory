"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { FaUpload, FaTimes } from 'react-icons/fa';
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
    removeScene,
    updateSelectedImage,
    deleteSceneImage
  } = useProjectManager();
  
  // local selected image id
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef(null);

  // Initialize state when modal opens
  React.useEffect(() => {
    if (isOpen && scene) {
      // Find current selected image id and scene title
      console.log("targeting selected imageId:", scene.selectedImageId)
      setSelectedImageId(scene.selectedImageId)
      setTitle(scene.title || '');
    }
  }, [isOpen, scene]);

  if (!isOpen || !scene) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageSelect = (imageId) => {
    // If the same image is clicked, deselect it
    if (selectedImageId === imageId) {
      setSelectedImageId(null);
    } else {
      setSelectedImageId(imageId);
    }
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
      // Handle image selection changes
      if (selectedImageId != scene.selectedImageId) {
        // update selected scene reference image
        // this update use specific function rather than the general
        // updateScene
        const selectedImage = scene.sceneImages.find(img => img.id === selectedImageId)
        const result = await updateSelectedImage(scene.id, selectedImage)
        if (!result.success) {
          alert(`Failed to save changes: ${result.error}`);
          return;
        }
      }

      // Add title if changed
      if (title !== scene.title) {
        const result = await updateScene(scene.id, {title});
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

  const handleDeleteImage = async (imageId, e) => {
    // Prevent event bubbling to avoid triggering image selection
    e.stopPropagation();
    
    try {
      const result = await deleteSceneImage(imageId);
      if (result.success) {
        console.log('Image deleted successfully');
        if (onSuccess) onSuccess();
      } else {
        alert(`Failed to delete image: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete image error:', error);
      alert(`Failed to delete image: ${error.message}`);
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
                key={imageObj.id } 
                className={`${styles.imageContainer} ${selectedImageId === imageObj.id ? styles.selected : ''}`}
                onClick={() => handleImageSelect(imageObj.id)}
              >
                <Image
                  src={imageObj.gcsUrl}
                  alt={`Scene option ${index + 1}`}
                  width={150}
                  height={225}
                  className={styles.image}
                />
                {/* Delete button */}
                <button
                  className={styles.deleteImageButton}
                  onClick={(e) => handleDeleteImage(imageObj.id, e)}
                  title="Delete this image"
                >
                  <FaTimes />
                </button>
                {selectedImageId === imageObj.id && (
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
