"use client";

import React, { useEffect } from 'react';
import styles from './FullSizeImageModal.module.css';
import Image from 'next/image';

const FullSizeImageModal = ({ isOpen, imageUrl, imageTitle, onClose }) => {
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

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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
            src={`https://storage.googleapis.com/shorts-scenes/${imageUrl}`}
            alt={imageTitle}
            width={800}
            height={1400}
            className={styles.image}
          />
        </div>
        <div className={styles.title}>{imageTitle}</div>
      </div>
    </div>
  );
};

export default FullSizeImageModal;
