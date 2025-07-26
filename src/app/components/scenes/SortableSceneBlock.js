import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SceneBlock from './SceneBlock';
import styles from './ImageGrid.module.css';

const SortableSceneBlock = ({ scene, onImageClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: scene.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={styles.sceneItem} 
            {...attributes} 
            {...listeners}
        >
            <SceneBlock scene={scene} onImageClick={onImageClick} />
        </div>
    );
};

export default SortableSceneBlock;
