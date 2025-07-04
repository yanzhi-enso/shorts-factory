import React, { useState } from 'react';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa';
import { useProjectManager } from 'app/hocs/ProjectManager';
import ElementImageModal from 'app/components/common/ElementImageModal';
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

const ElementImageList = ({ onAddElementImage }) => {
    const { projectState } = useProjectManager();
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
                <ElementImageBlock src={null} onClick={onAddElementImage} />
            </div>
            
            <ElementImageModal
                isOpen={isModalOpen}
                elementImage={selectedImage}
                onClose={handleCloseModal}
            />
        </>
    );
};

export default ElementImageList;
