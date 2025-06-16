import React from 'react';
import styles from './SceneImageBlock.module.css';
import Image from 'next/image';

import { useProjectManager } from 'app/hocs/ProjectManager';

// original scene image block. Display the scene that's extracted from the video

const SceneImageBlock = ({ scene, onImageClick }) => {
  const { updateSceneSelection } = useProjectManager();

  if (!scene || !scene.selected_image) {
    return null; // Handle case where scene or image is not available
  }
  
  const handleSceneToggle = async () => {
    updateSceneSelection(scene.id, !scene.is_selected);
  }

  return (
    <div 
      className={`${styles.gridItem} ${!scene.is_selected ? styles.deselected : ''}`}
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
          checked={scene.is_selected}
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
      {!scene.is_selected && <div className={styles.opacityMask} />}
      
      <Image
        src={scene.selected_image}
        alt={`Scene ${scene.scene_order / 100}`}
        width={200}
        height={350}
        className={styles.image}
      />
      
      {/* Scene info */}
      <div className={styles.sceneInfo}>
        <span>Scene {scene.scene_order / 100}</span>
      </div>
    </div>
  );
};

export default SceneImageBlock;
