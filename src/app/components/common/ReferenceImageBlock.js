"use client";

import React from "react";
import styles from "./ReferenceImageBlock.module.css";
import Image from "next/image";
import { FaTimes } from "react-icons/fa";

const ReferenceImageBlock = ({ scene, onImageClick, onImageReset, disabled = false }) => {
    const { selectedImage: imageUrl, title } = scene;

    const handleClick = () => {
        if (!disabled && onImageClick) {
            console.log("try to call onImageCick")
            onImageClick(scene);
        }
    };

    const handleResetClick = (e) => {
        e.stopPropagation(); // Prevent triggering the main click handler
        if (!disabled && onImageReset) {
            onImageReset(scene.id);
        }
    };

    const renderContent = () => {
        if (imageUrl) {
            return (
                <Image
                    src={imageUrl}
                    alt={"Reference Image"}
                    width={200}
                    height={300}
                    className={styles.image}
                />
            );
        }

        if (title) {
            return (
                <div className={styles.titleState}>
                    <div className={styles.titleText}>{title}</div>
                </div>
            );
        }

        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyText}>No Image Available</div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div
                className={`${styles.imageBlock} ${
                    !imageUrl ? styles.empty : ""
                } ${disabled ? styles.disabled : ""}`}
                onClick={handleClick}
            >
                {renderContent()}
                {imageUrl && !disabled && (
                    <button
                        className={styles.resetButton}
                        onClick={handleResetClick}
                        aria-label="Clear reference image"
                        title="Clear reference image"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReferenceImageBlock;
