import React, { useState } from 'react';

import styles from './ImageGrid.module.css';
import ReferenceImageSelectionModal from 'app/components/common/ReferenceImageSelectionModal';
import SceneBlock from './SceneBlock';
import AddSceneModal from './AddSceneModal';

const ImageGrid = ({ scenes }) => {
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        scene: null,
    });

    const [addModalState, setAddModalState] = useState({
        isOpen: false,
    });

    const handleImageClick = (scene) => {
        setEditModalState({
            isOpen: true,
            scene: scene,
        });
    };

    const closeEditModal = () => {
        setEditModalState({
            isOpen: false,
            scene: null,
        });
    };

    const handleAddScene = () => {
        setAddModalState({
            isOpen: true,
        });
    };

    const closeAddModal = () => {
        setAddModalState({
            isOpen: false,
        });
    };

    const handleSceneCreated = () => {
        // Optional: any additional logic after scene is created
        // The ProjectManager will handle state updates automatically
    };

    return (
        <>
            <div className={styles.grid}>
                {/* Add Scene Block - always first */}
                <SceneBlock scene={null} onAddScene={handleAddScene} />

                {/* Existing Scenes */}
                {scenes.map((scene, idx) => (
                    <SceneBlock
                        key={scene.id}
                        scene={scene}
                        idx={idx + 1}
                        onImageClick={handleImageClick}
                    />
                ))}
            </div>

            {/* Edit Scene Modal */}
            <ReferenceImageSelectionModal
                isOpen={editModalState.isOpen}
                onClose={closeEditModal}
                scene={editModalState.scene}
            />

            {/* Add Scene Modal */}
            <AddSceneModal
                isOpen={addModalState.isOpen}
                onClose={closeAddModal}
                onSuccess={handleSceneCreated}
            />
        </>
    );
};

export default ImageGrid;
