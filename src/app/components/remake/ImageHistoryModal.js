"use client";

import { useState, useRef } from 'react';
import { FaUpload } from 'react-icons/fa';
import styles from './ImageHistoryModal.module.css';
import Image from 'next/image';

const ImageHistoryModal = ({ 
  isOpen, 
  sceneId, 
  imageHistory = [], 
  selectedImageIndex = -1,
  onClose, 
  onSelectImage,
  onImageUpload 
}) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageClick = (index) => {
    if (onSelectImage) {
      onSelectImage(index);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
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
            {imageHistory.map((imageItem, index) => (
              <div 
                key={imageItem.id} 
                className={`${styles.imageItem} ${selectedImageIndex === index ? styles.selected : ''}`}
                onClick={() => handleImageClick(index)}
              >
                <Image
                  src={imageItem.imageUrl}
                  alt={`${imageItem.type === 'uploaded' ? 'Uploaded' : 'Generated'} ${index + 1}`}
                  width={150}
                  height={225}
                  className={styles.image}
                />
                <div className={styles.imageLabel}>
                  {imageItem.type === 'uploaded' ? '📁 Uploaded' : '🎨 Generated'} {index + 1}
                </div>
              </div>
            ))}
            
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
          {imageHistory.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📸</div>
              <p className={styles.emptyText}>No images yet</p>
              <p className={styles.emptySubtext}>Generate images or upload your own to see them here</p>
            </div>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default ImageHistoryModal;
