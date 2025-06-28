"use client";

import React from 'react';
import styles from '../ElementGenModal.module.css';

const PromptTab = () => {
    return (
        <div className={styles.tabContent}>
            <div className={styles.placeholder}>
                <h3>Text-to-Image & Image Extension</h3>
                <p>Text-to-image and image extension functionality coming soon...</p>
                <p>This tab will support:</p>
                <ul>
                    <li>Generate images from text prompts</li>
                    <li>Extend existing images with additional prompts</li>
                    <li>Multiple image generation options</li>
                </ul>
            </div>
        </div>
    );
};

export default PromptTab;
