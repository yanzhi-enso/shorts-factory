import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';

import styles from './ImageGrid.module.css';
import ReferenceImageSelectionModal from 'app/components/common/ReferenceImageSelectionModal';
import SceneBlock from './SceneBlock';
import SortableSceneBlock from './SortableSceneBlock';
import AddSceneModal from './AddSceneModal';
import { useProjectManager } from 'projectManager/useProjectManager';

const ImageGrid = ({ scenes }) => {
    const { updateSceneOrders } = useProjectManager();
    
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        scene: null,
    });

    const [addModalState, setAddModalState] = useState({
        isOpen: false,
    });

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement to start drag
            },
        })
    );

    // Only scenes (not add button) are sortable
    const sortableScenes = scenes || [];
    const sceneIds = sortableScenes.map(scene => scene.id);

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

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        
        if (!over || active.id === over.id) return;

        const oldIndex = sortableScenes.findIndex(scene => scene.id === active.id);
        const newIndex = sortableScenes.findIndex(scene => scene.id === over.id);

        // Create new order using arrayMove
        const reorderedScenes = arrayMove(sortableScenes, oldIndex, newIndex);
        
        // Update database and state
        const result = await updateSceneOrders(reorderedScenes);
        if (!result.success) {
            // Handle error - could show toast notification
            console.error('Failed to update scene order:', result.error);
            // Note: The UI will not update if the database operation failed
            // This maintains consistency between UI and database state
        }
    };

    return (
        <>
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
            >
                <div className={styles.grid}>
                    {/* Add Scene Block - NOT draggable */}
                    <div className={styles.sceneItem}>
                        <SceneBlock scene={null} onAddScene={handleAddScene} />
                    </div>

                    {/* Sortable Scenes */}
                    <SortableContext items={sceneIds} strategy={rectSortingStrategy}>
                        {sortableScenes.map((scene) => (
                            <SortableSceneBlock 
                                key={scene.id} 
                                scene={scene} 
                                onImageClick={handleImageClick} 
                            />
                        ))}
                    </SortableContext>
                </div>
            </DndContext>

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
