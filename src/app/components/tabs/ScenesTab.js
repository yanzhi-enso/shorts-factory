"use client";

import { useState } from 'react';
import styles from './ScenesTab.module.css';
import ImageGrid from '../scenes/ImageGrid';

const ScenesTab = ({ projectId, images, selectedIndices, setSelectedIndices, onBackToStart, onNext, onError }) => {
  const [currentImages, setCurrentImages] = useState(images);

  const handleDeleteScene = (sceneImages) => {
    // Remove all images belonging to the deleted scene
    setCurrentImages(prevImages => 
      prevImages.filter(img => !sceneImages.includes(img))
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={onBackToStart}
          className={styles.stepButton}
        >
          ← Back to Start
        </button>
        <p className={styles.projectId}>Pick Scenen and its index image for next step.</p>
        <button 
          onClick={() => onNext(currentImages)}
          className={styles.stepButton}
        >
          Next Step →
        </button>
      </div>
      
      <div className={styles.content}>
        {currentImages.length > 0 ? (
          <ImageGrid 
            images={currentImages} 
            selectedIndices={selectedIndices}
            setSelectedIndices={setSelectedIndices}
            onDeleteScene={handleDeleteScene} 
          />
        ) : (
          <p className={styles.noImages}>No images found for this project</p>
        )}
      </div>
    </div>
  );
};

export default ScenesTab;
