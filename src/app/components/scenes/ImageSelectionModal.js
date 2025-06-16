import React from 'react';
import Image from 'next/image';
import styles from './ImageSelectionModal.module.css';

const ImageSelectionModal = ({
  isOpen, onClose, scene, onSelectImage
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isSelected = (imageObj) => {
    return imageObj.gcsUrl === scene.selectedImage;
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.imageRow}>
          {scene?.sceneImages?.map((imageObj, index) => (
            <div 
              key={imageObj.id || index} 
              className={`${styles.imageContainer} ${isSelected(imageObj) ? styles.selected : ''}`}
              onClick={() => onSelectImage(index)}
            >
              <Image
                src={imageObj.gcsUrl}
                alt={`Scene option ${index + 1}`}
                width={150}
                height={250}
                className={styles.image}
              />
              {isSelected(imageObj) && (
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
