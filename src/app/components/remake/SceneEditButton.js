import React from 'react';
import { Tooltip } from 'react-tooltip';
import { FaPencilAlt } from 'react-icons/fa';

export default function SceneEditButton({ selectedRecord, onEditFromHistory, className, title = "Edit" }) {
    const handleEditClick = (e) => {
        e.stopPropagation();

        if (!selectedRecord || !selectedRecord.generationSources) {
            console.warn('No generation sources available for editing');
            return;
        }

        // Extract generation sources
        const generationSources = selectedRecord.generationSources;

        // Create edit data based on selectedRecord
        const editData = {
            prompt: generationSources.prompt || '',
            srcImages: generationSources.srcImages || [],
            imageCount: selectedRecord.gcsUrls?.length || generationSources.srcImages?.length || 1,
        };

        // Call the edit handler
        onEditFromHistory(editData);
    };

    // Only show for generated images (those with generationSources)
    if (!selectedRecord?.generationSources) {
        return null;
    }

    return (
        <>
            <button
                className={className}
                onClick={handleEditClick}
                data-tooltip-id='scene-edit-button-tooltip'
                data-tooltip-content={title}
                data-tooltip-place='bottom'
            >
                <FaPencilAlt />
            </button>
            <Tooltip id='scene-edit-button-tooltip' />
        </>
    );
}
