"use client";

import React from "react";
import styles from "./ReferenceImageBlock.module.css";
import Image from "next/image";

const ReferenceImageBlock = ({ scene, onImageClick, disabled = false }) => {
    const { selectedImage: imageUrl, title } = scene;

    const handleClick = () => {
        if (!disabled && onImageClick) {
            console.log("try to call onImageCick")
            onImageClick(scene);
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
            </div>
        </div>
    );
};

export default ReferenceImageBlock;
