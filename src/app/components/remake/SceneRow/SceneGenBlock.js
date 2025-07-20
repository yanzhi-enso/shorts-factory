"use client";

import { useCallback, useMemo, useState } from 'react';
import styles from './SceneGenBlock.module.css';
import Image from 'next/image';
import SceneGenHistoryModal from '../SceneGenHistoryModal';

const SceneGenBlock = ({
    sceneId,
    sceneDisplayName,
    generatedImages = [],
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

    // Find the selected image data
    const selectedImageData = useMemo(() => {
        return generatedImages.find(
            (img) => img.id === selectedGeneratedImageId
        );
    }, [selectedGeneratedImageId])

    const renderContent = useCallback(() => {
        if (!selectedImageData) {
            return (
                <div className={styles.emptyState}>
                    <div className={styles.emptyText}>
                        Generate to see result or upload an image
                    </div>
                </div>
            );
        }

        // Get current image URL from the multi-image structure
        const currentImageUrl = selectedImageData.gcsUrls?.[selectedImageData.selectedImageIdx] || selectedImageData.gcsUrls?.[0];
        const imageType = selectedImageData?.generationSources ? 'Generated' : 'Uploaded';

        if (!currentImageUrl) {
            return (
                <div className={styles.emptyState}>
                    <div className={styles.emptyText}>
                        No image available
                    </div>
                </div>
            );
        }

        return (
            <Image
                src={currentImageUrl}
                alt={`${sceneId} ${imageType}`}
                width={200}
                height={300}
                className={styles.image}
            />
        );
    }, [selectedGeneratedImageId, selectedImageData?.selectedImageIdx]);

    return (
        <>
            <div
                className={`${styles.imageBlock} ${!selectedImageData ? styles.empty : ''} ${
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
                sceneDisplayName={sceneDisplayName}
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
