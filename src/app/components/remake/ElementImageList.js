import React, { useState } from 'react';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useImageGen } from 'imageGenManager/ImageGenProvider';
import ElementImageDetailsModal from 'app/components/remake/ElementImageDetailsModal';
import styles from './ElementImageList.module.css';

const ElementImageBlock = ({ src, onClick }) => {
    return (
        <div className={`${styles.toolBoxBlock} ${!src ? styles.empty : ''}`} onClick={onClick}>
            {src ? (
                <Image
                    src={src}
                    alt='Tool box item'
                    width={100}
                    height={100}
                    className={styles.image}
                />
            ) : (
                <div className={styles.emptyState}>
                    <FaPlus className={styles.plusIcon} />
                </div>
            )}
        </div>
    );
};

const PendingImageBlock = ({ pendingItem }) => {
    return (
        <div className={`${styles.toolBoxBlock} ${styles.pending}`}>
            <div className={styles.pendingContent}>
                <div className={styles.loadingSpinner}></div>
                <div className={styles.pendingLabel}>
                    {pendingItem.type === 'text-to-image' ? 'Generating...' : 'Extending...'}
                </div>
                <div className={styles.pendingPrompt}>
                    {pendingItem.prompt.slice(0, 30)}...
                </div>
            </div>
        </div>
    );
};

const ElementImageList = ({ onAddElementImage }) => {
    const { projectState } = useProjectManager();
    const { pendingGenerations } = useImageGen();
    const elementImages = projectState.elementImages || [];
    
    const [selectedImage, setSelectedImage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleImageClick = (image) => {
        setSelectedImage(image);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedImage(null);
    };

    return (
        <>
            <div className={styles.container}>
                {/* Existing element images */}
                {elementImages.map((image) => {
                    // Get selected idx image URL from the multi-image structure
                    const idxImageUrl = image.gcsUrls?.[image.selectedImageIdx] || image.gcsUrls?.[0];
                    
                    return (
                        <ElementImageBlock
                            key={image.id}
                            src={idxImageUrl}
                            onClick={() => handleImageClick(image)}
                        />
                    );
                })}
                
                {/* Pending generations */}
                {pendingGenerations.map((pendingItem) => (
                    <PendingImageBlock
                        key={pendingItem.id}
                        pendingItem={pendingItem}
                    />
                ))}
                
                {/* Add new element image button */}
                <ElementImageBlock src={null} onClick={onAddElementImage} />
            </div>
            
            <ElementImageDetailsModal
                isOpen={isModalOpen}
                elementImage={selectedImage}
                onClose={handleCloseModal}
            />
        </>
    );
};

export default ElementImageList;
