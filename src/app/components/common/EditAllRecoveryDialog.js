"use client";

import React, { useEffect } from 'react';
import styles from './EditAllRecoveryDialog.module.css';

const EditAllRecoveryDialog = ({ isOpen, onClose }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose(null); // null means cancelled
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose(null); // null means cancelled
        }
    };

    const handleRecoverAll = () => {
        onClose(true); // true means recover both image and prompt
    };

    const handlePromptOnly = () => {
        onClose(false); // false means recover prompt only
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={() => onClose(null)}>
                    ×
                </button>

                <div className={styles.header}>
                    <h3 className={styles.title}>Edit All - Recovery Options</h3>
                </div>

                <div className={styles.content}>
                    <p className={styles.description}>
                        Choose what to recover from selected video clips:
                    </p>
                    
                    <div className={styles.buttonRow}>
                        <button 
                            className={`${styles.actionButton} ${styles.recoverAllButton}`}
                            onClick={handleRecoverAll}
                        >
                            🔄 Recover All
                        </button>
                        <button 
                            className={`${styles.actionButton} ${styles.promptOnlyButton}`}
                            onClick={handlePromptOnly}
                        >
                            📝 Prompt Only
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditAllRecoveryDialog;
