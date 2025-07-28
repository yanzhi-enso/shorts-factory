import React from 'react';
import { Tooltip } from 'react-tooltip';
import { FaPaintBrush } from 'react-icons/fa';

export default function InpaintingButton({
    onInpainting,
    className,
    title = 'Inpainting',
}) {
    const handleBrushClick = (e) => {
        e.stopPropagation();

        if (onInpainting) {
            onInpainting();
        }
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
