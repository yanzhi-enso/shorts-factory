"use client";

import { useState } from 'react';
import styles from './ImageHistoryModal.module.css';
import Image from 'next/image';

const ImageHistoryModal = ({ isOpen, sceneId, generationHistory, onClose, onSelectImage }) => {
  if (!isOpen) return null;

  const handleImageClick = (imageUrl) => {
    if (onSelectImage) {
      onSelectImage(imageUrl);
    }
    onClose();
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
          <h3 className={styles.title}>Generation History - {sceneId}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          {generationHistory && generationHistory.length > 0 ? (
            <div className={styles.imageGrid}>
              {generationHistory.map((imageUrl, index) => (
                <div 
                  key={index} 
                  className={styles.imageItem}
                  onClick={() => handleImageClick(imageUrl)}
                >
                  <Image
                    src={imageUrl}
                    alt={`Generation ${index + 1}`}
                    width={150}
                    height={225}
                    className={styles.image}
                  />
                  <div className={styles.imageLabel}>
                    Generation {generationHistory.length - index}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📸</div>
              <p className={styles.emptyText}>No generated images yet</p>
              <p className={styles.emptySubtext}>Generate some images to see them here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageHistoryModal;
