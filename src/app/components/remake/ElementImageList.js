import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import { useImageGenContext } from 'app/components/remake/ImageRequestManager';
import { useElementGenModalContext } from './ElementGenModal/ElementGenModalContext';
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

    useEffect(() => {
        console.log('pending image block updated, current length:', pendingGenerations.length);
    }, [pendingGenerations]);

    return (
        <>
            <div className={styles.container}>
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
                        />
                    );
                })}

                {/* Pending generations */}
                {pendingGenerations.map((pendingItem) => (
                    <PendingImageBlock key={pendingItem.id} pendingItem={pendingItem} />
                ))}

                {/* Add new element image button */}
                <ElementImageBlock src={null} onClick={openElementGenModal} />
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
