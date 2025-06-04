import React, { useState, useMemo } from 'react';
import styles from './ImageGrid.module.css';
import ImageSelectionModal from './ImageSelectionModal';
import SceneImageBlock from './SceneImageBlock';

const ImageGrid = ({ images, selectedIndices, setSelectedIndices, onDeleteScene }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    sceneIndex: null,
    sceneImages: []
  });

  console.log("total images:", images.length);

  // Group images by scene
  const groupedScenes = useMemo(() => {
    const scenes = {};
    
    images.forEach(imgUrl => {
      // Extract scene identifier from filename (e.g., "project123/video-Scene-001-01.jpg" -> "Scene-001")
      const match = imgUrl.match(/video-Scene-(\d+)-(\d+)\./);
      if (match) {
        const sceneId = `Scene-${match[1]}`;
        if (!scenes[sceneId]) {
          scenes[sceneId] = [];
        }
        scenes[sceneId].push(imgUrl);
      }
    });

    console.log("number of scenes:", Object.keys(scenes).length);

    // Sort images within each scene
    Object.keys(scenes).forEach(sceneId => {
      scenes[sceneId].sort();
    });

    return Object.entries(scenes).map(([sceneId, sceneImages]) => ({
      sceneId,
      images: sceneImages
    }));
  }, [images]);

  console.log("grouped scenes:", groupedScenes);

  const handleImageClick = (sceneIndex, sceneImages) => {
    setModalState({
      isOpen: true,
      sceneIndex,
      sceneImages
    });
  };

  const handleSelectImage = (imageIndex) => {
    setSelectedIndices(prev => ({
      ...prev,
      [modalState.sceneIndex]: imageIndex
    }));
  };

  const handleDeleteScene = (e, sceneIndex, scene) => {
    e.stopPropagation(); // Prevent triggering the image click
    if (onDeleteScene) {
      onDeleteScene(scene.images);
    }
    
    // Clean up selectedIndices for deleted scene and adjust indices for remaining scenes
    setSelectedIndices(prev => {
      const newIndices = {};
      Object.keys(prev).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex < sceneIndex) {
          newIndices[keyIndex] = prev[keyIndex];
        } else if (keyIndex > sceneIndex) {
          newIndices[keyIndex - 1] = prev[keyIndex];
        }
        // Skip the deleted scene index
      });
      return newIndices;
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      sceneIndex: null,
      sceneImages: []
    });
  };

  return (
    <>
      <div className={styles.grid}>
        {groupedScenes.map((scene, sceneIndex) => {
          console.log("scene:", scene, "index:", sceneIndex);
          const selectedImageIndex = selectedIndices[sceneIndex] !== undefined ? selectedIndices[sceneIndex] : 1; // Default to middle image (index 1)
          
          return (
            <SceneImageBlock
              key={scene.sceneId}
              scene={scene}
              sceneIndex={sceneIndex}
              selectedImageIndex={selectedImageIndex}
              onImageClick={handleImageClick}
              onDeleteScene={handleDeleteScene}
            />
          );
        })}
      </div>

      <ImageSelectionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        sceneImages={modalState.sceneImages}
        onSelectImage={handleSelectImage}
        selectedIndex={selectedIndices[modalState.sceneIndex] !== undefined ? selectedIndices[modalState.sceneIndex] : 1}
      />
    </>
  );
};

export default ImageGrid;
