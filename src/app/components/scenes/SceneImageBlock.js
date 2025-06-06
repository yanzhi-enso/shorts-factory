import React from 'react';
import styles from './SceneImageBlock.module.css';
import Image from 'next/image';

const SceneImageBlock = ({ 
  scene, 
  sceneIndex, 
  selectedImageIndex, 
  onImageClick, 
  onDeleteScene 
}) => {
  const displayImage = scene.images[selectedImageIndex];
  
  return (
    <div 
      className={`${styles.gridItem} ${selectedImageIndex !== 1 ? styles.customSelected : ''}`}
      onClick={() => onImageClick(sceneIndex, scene.images)}
    >
      <button
        className={styles.deleteButton}
        onClick={(e) => onDeleteScene(e, sceneIndex, scene)}
        aria-label="Delete scene"
      >
        ×
      </button>
      <Image
        src={displayImage}
        alt={`Scene ${sceneIndex + 1}`}
        width={200}
        height={350}
        className={styles.image}
      />
    </div>
  );
};

export default SceneImageBlock;
