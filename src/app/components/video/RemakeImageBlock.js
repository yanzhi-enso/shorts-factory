import React from 'react';
import styles from './RemakeImageBlock.module.css';
import Image from 'next/image';
import { Tooltip } from 'react-tooltip';
import { FaSyncAlt } from 'react-icons/fa';

const RemakeImageBlock = ({
    imageUrl,
    title,
    onClick,
    showResetButton = false,
    onResetImageUrl,
}) => {
    return (
        <div
            className={`${styles.imageBlock} ${!imageUrl ? styles.empty : ''}`}
            onClick={() => {
                if (onClick) onClick(imageUrl, title);
            }}
        >
            {imageUrl ? (
                <Image
                    src={imageUrl}
                    alt={title}
                    width={200}
                    height={300}
                    className={styles.image}
                />
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyText}>No image</div>
                </div>
            )}
            {imageUrl && showResetButton && (
                <>
                    <button
                        className={styles.refreshButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            onResetImageUrl();
                        }}
                        data-tooltip-id='reset-button-tooltip'
                        data-tooltip-content='Reset Image'
                        data-tooltip-place='bottom'
                    >
                        <FaSyncAlt />
                    </button>
                    <Tooltip id='reset-button-tooltip' />
                </>
            )}
        </div>
    );
};

export default RemakeImageBlock;
