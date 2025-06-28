"use client";

import { useState } from 'react';
import styles from './SceneGenBlock.module.css';
import Image from 'next/image';
import SceneGenHistoryModal from './SceneGenHistoryModal';

const SceneGenBlock = ({
    sceneId,
    generatedImages = [],
    selectedGeneratedImage = null,
    selectedGeneratedImageId = null,
    onImageUpload,
    onImageSelect,
}) => {
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    const handleClick = () => {
        // Always open history modal when clicked - this allows both selection and upload
        setHistoryModalOpen(true);
    };

    const handleHistoryModalClose = () => {
        setHistoryModalOpen(false);
    };

    const handleSelectFromHistory = (selectedImageId) => {
        if (onImageSelect) {
            onImageSelect(selectedImageId);
        }
        setHistoryModalOpen(false);
    };

    const handleImageUploadFromModal = (imageFile) => {
        if (onImageUpload) {
            onImageUpload(imageFile);
        }
    };

    const renderContent = () => {
        if (!selectedGeneratedImage) {
            return (
                <div className={styles.emptyState}>
                    <div className={styles.emptyText}>
                        Generate to see result or upload an image
                    </div>
                </div>
            );
        }

        // Determine image type based on generationSources
        const selectedImageData = generatedImages.find(
            (img) => img.id === selectedGeneratedImageId
        );
        const imageType = selectedImageData?.generationSources ? 'Generated' : 'Uploaded';

        return (
            <Image
                src={selectedGeneratedImage}
                alt={`${sceneId} ${imageType}`}
                width={200}
                height={300}
                className={styles.image}
            />
        );
    };

    return (
        <>
            <div
                className={`${styles.imageBlock} ${!selectedGeneratedImage ? styles.empty : ''} ${
                    styles.generated
                }`}
                onClick={handleClick}
            >
                {renderContent()}

                {/* Show history indicator if there are multiple images */}
                {generatedImages.length > 1 && (
                    <div className={styles.historyIndicator}>
                        {generatedImages.findIndex((img) => img.id === selectedGeneratedImageId) +
                            1}
                        /{generatedImages.length}
                    </div>
                )}
            </div>

            {/* History Modal */}
            <SceneGenHistoryModal
                isOpen={historyModalOpen}
                sceneId={sceneId}
                generatedImages={generatedImages}
                selectedGeneratedImageId={selectedGeneratedImageId}
                onClose={handleHistoryModalClose}
                onSelectImage={handleSelectFromHistory}
                onImageUpload={handleImageUploadFromModal}
            />
        </>
    );
};

export default SceneGenBlock;
