import React from 'react';
import { Tooltip } from 'react-tooltip';

import { useElementGenModalContext } from './ElementGenModalContext';
import { FaPencilAlt } from 'react-icons/fa';

export default function EditButton({ elementImage, className, title = "Edit" }) {
    const { openModal } = useElementGenModalContext();

    const handleEditClick = (e) => {
        e.stopPropagation();

        // Extract generation sources if available
        const generationSources = elementImage.generationSources;

        // Create prefill data based on elementImage
        const prefillData = {
            initialTab: generationSources?.type === 'inpainting' ? 'inpainting' : 'prompt',
            prompt: generationSources?.prompt || '',
            srcImages: generationSources?.srcImages || [],
            maskImage: generationSources?.maskImage || null,
            size: generationSources?.size,
            sourceRecordId: elementImage.id,
        };

        // Open modal with prefill data
        openModal(prefillData);
    };

    return (
        <>
            <button
                className={className}
                onClick={handleEditClick}
                data-tooltip-id='edit-button-tooltip'
                data-tooltip-content={title}
                data-tooltip-place='bottom'
            >
                <FaPencilAlt />
            </button>
            <Tooltip id='edit-button-tooltip' />
        </>
    );
}
