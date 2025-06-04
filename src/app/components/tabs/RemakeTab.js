"use client";

import { useState, useMemo } from 'react';
import styles from './RemakeTab.module.css';
import RemakeImageBlock from '../RemakeImageBlock';
import FullSizeImageModal from '../FullSizeImageModal';

const RemakeTab = ({ projectId, images, selectedIndices, onBackToScenes, onNext, onError }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    imageUrl: null,
    imageTitle: null
  });

  // Group images by scene and extract selected images
  const originalImages = useMemo(() => {
    const scenes = {};
    
    // Group images by scene
    images.forEach(imgUrl => {
      const match = imgUrl.match(/video-Scene-(\d+)-(\d+)\./);
      if (match) {
        const sceneId = `Scene-${match[1]}`;
        if (!scenes[sceneId]) {
          scenes[sceneId] = [];
        }
        scenes[sceneId].push(imgUrl);
      }
    });

    // Sort images within each scene
    Object.keys(scenes).forEach(sceneId => {
      scenes[sceneId].sort();
    });

    // Convert to array and extract selected images
    const groupedScenes = Object.entries(scenes).map(([sceneId, sceneImages]) => ({
      sceneId,
      images: sceneImages
    }));

    // Extract selected images for each scene
    return groupedScenes.map((scene, index) => {
      const selectedImageIndex = selectedIndices[index] !== undefined ? selectedIndices[index] : 1;
      return {
        sceneId: scene.sceneId,
        imageUrl: scene.images[selectedImageIndex],
        title: `${scene.sceneId} Original`
      };
    }).filter(item => item.imageUrl); // Filter out any undefined images

  }, [images, selectedIndices]);

  const handleImageClick = (imageUrl, title) => {
    setModalState({
      isOpen: true,
      imageUrl,
      imageTitle: title
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      imageUrl: null,
      imageTitle: null
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={onBackToScenes}
          className={styles.stepButton}
        >
          ← Back to Scenes
        </button>
        <p className={styles.projectId}>Project ID: {projectId}</p>
        <button 
          onClick={onNext}
          className={styles.stepButton}
        >
          Next Step →
        </button>
      </div>
      
      <div className={styles.rowsContainer}>
        {originalImages.map((item, index) => (
          <div key={`${item.sceneId}-${index}`} className={styles.sceneRow}>
            <div className={styles.imageCell}>
              <RemakeImageBlock
                imageUrl={item.imageUrl}
                title={item.title}
                onClick={handleImageClick}
              />
            </div>
          </div>
        ))}
      </div>

      <FullSizeImageModal
        isOpen={modalState.isOpen}
        imageUrl={modalState.imageUrl}
        imageTitle={modalState.imageTitle}
        onClose={closeModal}
      />
    </div>
  );
};

export default RemakeTab;
