import React, { useEffect, useCallback } from 'react';
import styles from './FullscreenImageModal.module.css';
import { FaTimes } from 'react-icons/fa';

export default function FullscreenImageModal({ imageUrl, isOpen, onClose }) {
    const handleBackdropClick = (e) => {
        // Only close if clicking on the backdrop, not the image
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || !imageUrl) {
        return null;
    }

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <button className={styles.closeButton} onClick={onClose}>
                <FaTimes />
            </button>
            <img
                src={imageUrl}
                alt="Fullscreen view"
                className={styles.fullscreenImage}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
            />
        </div>
    );
}
