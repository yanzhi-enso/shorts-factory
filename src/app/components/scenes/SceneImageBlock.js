import React from 'react';
import styles from './SceneImageBlock.module.css';
import ReferenceImageBlock from 'app/components/common/ReferenceImageBlock';

import { useProjectManager } from 'projectManager/useProjectManager';

// Scene image block that uses ReferenceImageBlock for display

const SceneImageBlock = ({ scene, onImageClick }) => {
  const { updateSceneSelection } = useProjectManager();

  if (!scene) {
    return null; // Handle case where scene is not available
  }
  
  const handleSceneToggle = async () => {
    updateSceneSelection(scene.id, !scene.isSelected);
  }

  const handleImageClick = () => {
    if (onImageClick) {
      onImageClick(scene);
    }
  }

  return (
    <div className={`${styles.gridItem} ${!scene.isSelected ? styles.deselected : ''}`}>
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
      
      {/* Use ReferenceImageBlock for image display */}
      <ReferenceImageBlock 
        scene={scene}
        onImageClick={handleImageClick}
      />
      
      {/* Scene info */}
      <div className={styles.sceneInfo}>
        <span>Scene {scene.sceneOrder / 100}</span>
      </div>
    </div>
  );
};

export default SceneImageBlock;
