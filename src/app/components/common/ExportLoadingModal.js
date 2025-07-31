"use client";

import React, { useEffect } from 'react';
import styles from './ExportLoadingModal.module.css';

const ExportLoadingModal = ({ isOpen, exportType = 'files' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getLoadingText = () => {
        switch (exportType) {
            case 'images':
                return 'Exporting Images...';
            case 'videos':
                return 'Exporting Videos...';
            default:
                return 'Exporting Files...';
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className={styles.spinner}></div>
                <p className={styles.text}>{getLoadingText()}</p>
                <p className={styles.subtext}>Please wait while we prepare your download</p>
            </div>
        </div>
    );
};

export default ExportLoadingModal;
