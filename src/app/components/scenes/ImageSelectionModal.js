import React from 'react';
import Image from 'next/image';
import styles from './ImageSelectionModal.module.css';

const ImageSelectionModal = ({ isOpen, onClose, sceneImages, onSelectImage, selectedIndex }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageSelect = (index) => {
    onSelectImage(index);
    onClose(); // Auto-close after selection
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.imageRow}>
          {sceneImages.map((imageUrl, index) => (
            <div 
              key={index} 
              className={`${styles.imageContainer} ${selectedIndex === index ? styles.selected : ''}`}
              onClick={() => handleImageSelect(index)}
            >
              <Image
                src={imageUrl}
                alt={`Scene option ${index + 1}`}
                width={150}
                height={250}
                className={styles.image}
              />
              {selectedIndex === index && (
                <div className={styles.selectedIndicator}>✓</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionModal;
