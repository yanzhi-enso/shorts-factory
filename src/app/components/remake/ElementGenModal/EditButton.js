import React from 'react';
import { Tooltip } from 'react-tooltip';
import { FaPencilAlt } from 'react-icons/fa';

export default function EditButton({ onEdit, className, title = 'Edit' }) {
    const handleEditClick = (e) => {
        e.stopPropagation();

        if (onEdit) {
            onEdit();
        }
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
