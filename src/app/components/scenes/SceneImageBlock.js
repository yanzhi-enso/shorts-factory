import React from 'react';
import styles from './SceneImageBlock.module.css';
import Image from 'next/image';

import { useProjectManager } from 'app/hocs/ProjectManager';

// original scene image block. Display the scene that's extracted from the video

const SceneImageBlock = ({ scene, onImageClick }) => {
  const { updateSceneSelection } = useProjectManager();

  if (!scene || !scene.selectedImage) {
    return null; // Handle case where scene or image is not available
  }
  
  const handleSceneToggle = async () => {
    updateSceneSelection(scene.id, !scene.isSelected);
  }

  return (
    <div 
      className={`${styles.gridItem} ${!scene.isSelected ? styles.deselected : ''}`}
      onClick={ () => {
        if (scene?.sceneImages?.length > 1) {
          // only scenes with multiple images
          // can trigger the image selection modal
          onImageClick(scene)
        }
      }}
    >
      {/* Checkbox in top-right corner */}
      <div 
        className={styles.selectionCheckbox}
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering image click
        }}
      >
        <input 
          type="checkbox" 
          checked={scene.isSelected}
          onChange={(e) => {
            e.stopPropagation(); // Prevent triggering image click
            handleSceneToggle();
          }}
          onClick={(e) => {
            e.stopPropagation(); // Additional prevention for checkbox click
          }}
          className={styles.checkbox}
        />
      </div>
      
      {/* Opacity mask for deselected scenes */}
      {!scene.isSelected && <div className={styles.opacityMask} />}
      
      <Image
        src={scene.selectedImage}
        alt={`Scene ${scene.sceneOrder / 100}`}
        width={200}
        height={350}
        className={styles.image}
      />
      
      {/* Scene info */}
      <div className={styles.sceneInfo}>
        <span>Scene {scene.sceneOrder / 100}</span>
      </div>
    </div>
  );
};

export default SceneImageBlock;
