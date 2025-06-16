"use client";

import { useState } from 'react';
import styles from './GeneratedImageBlock.module.css';
import Image from 'next/image';
import ImageHistoryModal from './ImageHistoryModal';

const GeneratedImageBlock = ({ 
  sceneId,
  selectedImage = null,
  imageHistory = [],
  selectedImageIndex = -1,
  onImageUpload,
  onImageSelect,
}) => {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const handleClick = () => {
    // Always open history modal when clicked - this allows both selection and upload
    setHistoryModalOpen(true);
  };

  const handleHistoryModalClose = () => {
    setHistoryModalOpen(false);
  };

  const handleSelectFromHistory = (selectedIndex) => {
    if (onImageSelect) {
      onImageSelect(sceneId, selectedIndex);
    }
    setHistoryModalOpen(false);
  };

  const handleImageUploadFromModal = (file) => {
    if (onImageUpload) {
      onImageUpload(sceneId, file);
    }
  };

  const renderContent = () => {
    if (!selectedImage) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>
            Generate to see result or upload an image
          </div>
        </div>
      );
    }

    return (
      <Image
        src={selectedImage.imageUrl}
        alt={`${sceneId} ${selectedImage.type === 'uploaded' ? 'Uploaded' : 'Generated'}`}
        width={200}
        height={300}
        className={styles.image}
      />
    );
  };

  return (
    <>
      <div 
        className={`${styles.imageBlock} ${!selectedImage ? styles.empty : ''} ${styles.generated}`} 
        onClick={handleClick}
      >
        {renderContent()}
        
        {/* Show history indicator if there are multiple images */}
        {imageHistory.length > 1 && (
          <div className={styles.historyIndicator}>
            {selectedImageIndex + 1}/{imageHistory.length}
          </div>
        )}
      </div>

      {/* History Modal */}
      <ImageHistoryModal
        isOpen={historyModalOpen}
        sceneId={sceneId}
        imageHistory={imageHistory}
        selectedImageIndex={selectedImageIndex}
        onClose={handleHistoryModalClose}
        onSelectImage={handleSelectFromHistory}
        onImageUpload={handleImageUploadFromModal}
      />
    </>
  );
};

export default GeneratedImageBlock;
