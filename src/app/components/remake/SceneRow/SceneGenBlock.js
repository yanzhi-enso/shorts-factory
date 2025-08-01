"use client";

import { useCallback, useMemo } from 'react';
import styles from './SceneGenBlock.module.css';
import Image from 'next/image';
import { useElementManager } from '../ElementList/ElementSelectionManager';

const SceneGenBlock = ({ scene, onOpenHistoryModal }) => {
    // Extract data from scene object
    const { id: sceneId, generatedImages = [], selectedGeneratedImageId = null } = scene;

    // ElementSelectionManager integration
    const { focusedSceneId, appendElementToScene, selectedElements } = useElementManager();

    // Find the selected image data
    const selectedImageData = useMemo(() => {
        return generatedImages.find((img) => img.id === selectedGeneratedImageId);
    }, [generatedImages, selectedGeneratedImageId]);

    const handleClick = () => {
        if (focusedSceneId !== null) {
            // Check capacity limit (10 elements max)
            const currentElements = selectedElements[focusedSceneId] || [];
            if (currentElements.length >= 10) {
                console.log(`Scene ${focusedSceneId} is at maximum capacity (10 elements)`);
                return;
            }

            // Add current image to focused scene
            const currentImageUrl =
                selectedImageData?.gcsUrls?.[selectedImageData.selectedImageIdx] ||
                selectedImageData?.gcsUrls?.[0];
            if (currentImageUrl) {
                appendElementToScene(focusedSceneId, currentImageUrl);
            }
        } else {
            // Normal behavior: open centralized modal with scene data
            if (onOpenHistoryModal) {
                onOpenHistoryModal(scene);
            }
        }
    };

    // Prevent focus loss when clicking
    const handleMouseDown = (e) => {
        e.preventDefault();
    };

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
        const currentImageUrl =
            selectedImageData.gcsUrls?.[selectedImageData.selectedImageIdx] ||
            selectedImageData.gcsUrls?.[0];
        const imageType = selectedImageData?.generationSources ? 'Generated' : 'Uploaded';

        if (!currentImageUrl) {
            return (
                <div className={styles.emptyState}>
                    <div className={styles.emptyText}>No image available</div>
                </div>
            );
        }

        return (
            <img
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
            onMouseDown={handleMouseDown}
        >
            {renderContent()}

            {/* Show history indicator if there are multiple images */}
            {generatedImages.length > 1 && (
                <div className={styles.historyIndicator}>
                    {generatedImages.findIndex((img) => img.id === selectedGeneratedImageId) + 1}/
                    {generatedImages.length}
                </div>
            )}
        </div>
    );
};

export default SceneGenBlock;
