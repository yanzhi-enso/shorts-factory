"use client";

import { useCallback, useMemo } from 'react';
import styles from './SceneGenBlock.module.css';
import Image from 'next/image';

const SceneGenBlock = ({
    scene,
    sceneDisplayName,
    onOpenHistoryModal,
}) => {
    // Extract data from scene object
    const { id: sceneId, generatedImages = [], selectedGeneratedImageId = null } = scene;

    const handleClick = () => {
        // Open centralized modal with scene data
        if (onOpenHistoryModal) {
            onOpenHistoryModal(scene);
        }
    };

    // Find the selected image data
    const selectedImageData = useMemo(() => {
        return generatedImages.find(
            (img) => img.id === selectedGeneratedImageId
        );
    }, [generatedImages, selectedGeneratedImageId]);

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
    }, [selectedImageData, sceneId]);

    return (
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
                    {generatedImages.findIndex((img) => img.id === selectedGeneratedImageId) + 1}
                    /{generatedImages.length}
                </div>
            )}
        </div>
    );
};

export default SceneGenBlock;
