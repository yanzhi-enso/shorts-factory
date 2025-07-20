import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useImageGenContext } from 'app/components/remake/ImageRequestManager';
import { ASSET_TYPES } from 'constants/gcs'; 
import { useElementGenModalContext } from '../ElementGenModal/ElementGenModalContext';
import { useElementManager } from './ElementSelectionManager';
import ElementImageDetailsModal from 'app/components/remake/ElementList/ElementImageDetailsModal';
import styles from './ElementImageList.module.css';

const AddElementImageButton = ({ onClick, disabled = false }) => (
    <div 
        className={`${styles.toolBoxBlock} ${styles.empty} ${disabled ? styles.disabled : ''}`} 
        onClick={disabled ? undefined : onClick}
    >
        <div className={styles.emptyState}>
            <FaPlus className={styles.plusIcon} />
        </div>
    </div>
);

const ElementImageBlock = ({ src, onClick, activated = false }) => {
    const handleMouseDown = (e) => {
        // Prevent the textarea from losing focus when clicking elements
        e.preventDefault();
    };

    return (
        <div 
            className={`${styles.toolBoxBlock} ${activated ? styles.activated : ''}`} 
            onClick={onClick}
            onMouseDown={handleMouseDown}
        >
            <img
                src={src}
                alt='Tool box item'
                // width={120} height={120}
                className={styles.image}
            />
        </div>
    );
};

const PendingImageBlock = ({ pendingItem, disabled = false }) => {
    return (
        <div className={`${styles.toolBoxBlock} ${styles.pending} ${disabled ? styles.disabled : ''}`}>
            <div className={styles.pendingContent}>
                <div className={styles.loadingSpinner}></div>
                <div className={styles.pendingLabel}>
                    {pendingItem.type === 'text-to-image'
                        ? 'Generating...'
                        : pendingItem.type === 'image-extension'
                        ? 'Extending...'
                        : 'Inpainting...'}
                </div>
                <div className={styles.pendingPrompt}>{pendingItem.prompt.slice(0, 30)}...</div>
            </div>
        </div>
    );
};

const ElementImageList = () => {
    const { projectState } = useProjectManager();
    const { pendingGenerations } = useImageGenContext();
    const { openModal: openElementGenModal } = useElementGenModalContext()
    const { focusedSceneId, appendElementToScene, selectedElements } = useElementManager();
    const elementImages = projectState.elementImages || [];

    const [selectedImage, setSelectedImage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleImageClick = (image) => {
        if (focusedSceneId !== null) {
            // Check if scene already has 10 elements (max capacity)
            const currentElements = selectedElements[focusedSceneId] || [];
            if (currentElements.length >= 10) {
                // Ignore click when at capacity
                console.log(`Scene ${focusedSceneId} is at maximum capacity (10 elements)`);
                return;
            }
            
            // When a scene is focused, add element to scene instead of showing details
            const idxImageUrl = image.gcsUrls?.[image.selectedImageIdx] || image.gcsUrls?.[0];
            appendElementToScene(focusedSceneId, idxImageUrl);
        } else {
            // Normal behavior: show element details modal
            setSelectedImage(image);
            setIsModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedImage(null);
    };

    useEffect(() => {
        console.log('pending image block updated, current length:', pendingGenerations.length);
    }, [pendingGenerations]);

    const isSceneFocused = focusedSceneId !== null;

    return (
        <div className={`${styles.container} ${isSceneFocused ? styles.activated : ''}`}>
            <div className={styles.list}>
                {/* Add new element image button */}
                { !focusedSceneId &&
                    <AddElementImageButton 
                        onClick={openElementGenModal} 
                        disabled={isSceneFocused}
                    />
                }

                {/* Pending generations */}
                {pendingGenerations.reverse().filter(img => img.assetType==ASSET_TYPES.ELEMENT_IMAGES).map((pendingItem) => (
                    <PendingImageBlock 
                        key={pendingItem.id} 
                        pendingItem={pendingItem} 
                        disabled={isSceneFocused}
                    />
                ))}

                {/* Existing element images */}
                {elementImages.map((image) => {
                    // Get selected idx image URL from the multi-image structure
                    const idxImageUrl =
                        image.gcsUrls?.[image.selectedImageIdx] || image.gcsUrls?.[0];

                    return (
                        <ElementImageBlock
                            key={image.id}
                            src={idxImageUrl}
                            onClick={() => handleImageClick(image)}
                            activated={isSceneFocused}
                        />
                    );
                })}
            </div>

            <ElementImageDetailsModal
                isOpen={isModalOpen}
                elementImage={selectedImage}
                onClose={handleCloseModal}
            />
        </div>
    );
};

export default ElementImageList;
