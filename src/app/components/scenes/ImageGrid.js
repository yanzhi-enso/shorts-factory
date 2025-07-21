import React, { useState } from 'react';

import { useProjectManager } from 'projectManager/useProjectManager';
import styles from './ImageGrid.module.css';
import ReferenceImageSelectionModal from 'app/components/common/ReferenceImageSelectionModal';
import SceneImageBlock from './SceneImageBlock';

const ImageGrid = ({ scenes }) => {
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

    const closeModal = () => {
        setModalState({
            isOpen: false,
            scene: null,
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

            <ReferenceImageSelectionModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                scene={modalState.scene}
            />
        </>
    );
};

export default ImageGrid;
