import React, { useState } from 'react';

import { useProjectManager } from 'app/hocs/ProjectManager';
import styles from './ImageGrid.module.css';
import ImageSelectionModal from './ImageSelectionModal';
import SceneImageBlock from './SceneImageBlock';

const ImageGrid = ({ scenes }) => {
    const { updateSelectedImage } = useProjectManager();
    const [modalState, setModalState] = useState({
        isOpen: false,
        scene: null,
    });

    const handleImageClick = (scene) => {
        setModalState({
            isOpen: true,
            scene: scene,
        });
    };

    const handleSelectImage = (imageIndex) => {
        const selectedImage = modalState.scene?.sceneImages[imageIndex];

        if (selectedImage) {
            updateSelectedImage(
                modalState.scene.id, selectedImage
            ).then(result => {
                if (!result.success) {
                    // Update the scene's selected image ID
                    onError(result.error);
                }
            });
        }

        closeModal();
    };


    const closeModal = () => {
        setModalState({
            isOpen: false,
            sceneId: null,
            sceneImages: []
        });
    };

    return (
        <>
            <div className={styles.grid}>
                {scenes.map((scene) => (
                    <SceneImageBlock
                        key={scene.id}
                        scene={scene}
                        onImageClick={handleImageClick}
                    />
                ))}
            </div>

            <ImageSelectionModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                scene={modalState.scene}
                onSelectImage={handleSelectImage}
            />
        </>
    );
};

export default ImageGrid;
