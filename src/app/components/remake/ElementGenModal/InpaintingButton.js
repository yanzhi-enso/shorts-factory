import React from 'react';
import { Tooltip } from 'react-tooltip';

import { useElementGenModalContext } from './ElementGenModalContext';
import { FaPaintBrush } from 'react-icons/fa';
import { IMAGE_SIZE_PORTRAIT } from 'constants/image';

export default function InpaintingButton({
    elementImage,
    currentImageIdx,
    className,
    title = 'Inpainting',
}) {
    const { openModal } = useElementGenModalContext();

    const handleBrushClick = (e) => {
        e.stopPropagation();

        // Get current image URL using the passed currentImageIdx
        const currentImageUrl = elementImage.gcsUrls[currentImageIdx];

        // Create minimal prefill data for fresh inpainting
        const prefillData = {
            initialTab: 'inpainting',
            srcImages: [{ url: currentImageUrl }],
            // Intentionally leave prompt and mask empty for fresh start
            prompt: '',
            mask: null,
            size: elementImage.generationSources?.size || IMAGE_SIZE_PORTRAIT, // Extract from generation sources or use default
            sourceRecordId: elementImage.id, // For reference only
        };

        // Open modal with minimal prefill data
        openModal(prefillData);
    };

    return (
        <>
            <button
                className={className}
                onClick={handleBrushClick}
                data-tooltip-id='inpainting-button-tooltip'
                data-tooltip-content={title}
                data-tooltip-place='top'
            >
                <FaPaintBrush />
            </button>

            <Tooltip id='inpainting-button-tooltip' />
        </>
    );
}
