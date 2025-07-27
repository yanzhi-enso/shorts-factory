import React from 'react';
import { Tooltip } from 'react-tooltip';
import { FaPaintBrush } from 'react-icons/fa';

export default function SceneInpaintingButton({ selectedRecord, onInpaintClick, sceneId, className, title = "Inpaint" }) {
    const handleInpaintClick = (e) => {
        e.stopPropagation();

        if (!selectedRecord) {
            console.warn('No scene image selected for inpainting');
            return;
        }

        // Get the current image URL for inpainting
        const currentImageUrl = selectedRecord.gcsUrls?.[selectedRecord.selectedImageIdx] || selectedRecord.gcsUrls?.[0];
        
        if (!currentImageUrl) {
            console.warn('No image URL available for inpainting');
            return;
        }

        // Create inpainting data
        const inpaintingData = {
            imageUrl: currentImageUrl,
            selectedRecord: selectedRecord,
            sceneId: sceneId,
        };

        // Call the inpainting handler
        onInpaintClick(inpaintingData);
    };

    // Show for all scene images (both generated and uploaded)
    if (!selectedRecord) {
        return null;
    }

    return (
        <>
            <button
                className={className}
                onClick={handleInpaintClick}
                data-tooltip-id='scene-inpainting-button-tooltip'
                data-tooltip-content={title}
                data-tooltip-place='bottom'
            >
                <FaPaintBrush />
            </button>
            <Tooltip id='scene-inpainting-button-tooltip' />
        </>
    );
}
