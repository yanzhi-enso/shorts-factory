import React from 'react';
import { Tooltip } from 'react-tooltip';

import { FaTrash } from 'react-icons/fa';

export default function DeleteButton({ onDelete, className, title = 'Delete' }) {
    const handleDeleteClick = (e) => {
        e.stopPropagation();

        if (onDelete) {
            onDelete();
        }
    };

    return (
        <>
            <button
                className={className}
                onClick={handleDeleteClick}
                data-tooltip-id='delete-button-tooltip'
                data-tooltip-content={title}
                data-tooltip-place='top'
            >
                <FaTrash />
            </button>
            <Tooltip id='delete-button-tooltip' />
        </>
    );
}
