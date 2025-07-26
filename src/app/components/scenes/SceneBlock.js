"use client";

import React from 'react';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import DeleteButton from '../common/DeleteButton';
import styles from './SceneBlock.module.css';

const SceneBlock = ({ scene, onImageClick, onAddScene }) => {
    const { updateSceneSelection, removeScene } = useProjectManager();

    // Determine what content to display based on scene state
    const getDisplayContent = (scene) => {
        // 1. No scene = Add button
        if (!scene) {
            return { type: 'add', content: null };
        }

        // 2. Check selected generated image
        if (scene.selectedGeneratedImageId) {
            const generatedImage = scene.generatedImages?.find(
                (img) => img.id === scene.selectedGeneratedImageId
            );
            if (generatedImage && generatedImage.gcsUrls && generatedImage.gcsUrls.length > 0) {
                const selectedIdx = generatedImage.selectedImageIdx || 0;
                return {
                    type: 'generated_image',
                    content: generatedImage.gcsUrls[selectedIdx],
                };
            }
        }

        // 3. Check selected reference image
        if (scene.selectedImage) {
            return { type: 'reference_image', content: scene.selectedImage };
        }

        // 4. Check scene title/name
        if (scene.title) {
            return { type: 'title', content: scene.title };
        }

        // 5. Default scene text
        return {
            type: 'default',
            content: `Scene ${scene.sceneOrder / 100}`,
        };
    };

    const displayInfo = getDisplayContent(scene);

    const handleClick = () => {
        if (displayInfo.type === 'add') {
            onAddScene();
        } else {
            onImageClick(scene);
        }
    };

    const handleSceneToggle = async (e) => {
        e.stopPropagation();
        if (scene) {
            updateSceneSelection(scene.id, !scene.isSelected);
        }
    };

    const handleDeleteScene = async () => {
        if (scene && confirm(`Are you sure you want to delete Scene ${idx}?`)) {
            try {
                await removeScene(scene.id);
            } catch (error) {
                console.error('Failed to delete scene:', error);
                alert('Failed to delete scene. Please try again.');
            }
        }
    };

    const renderContent = () => {
        switch (displayInfo.type) {
            case 'add':
                return (
                    <div className={styles.addContent}>
                        <FaPlus className={styles.addIcon} />
                        <div className={styles.addText}>Add Scene</div>
                    </div>
                );

            case 'generated_image':
            case 'reference_image':
                return (
                    <Image
                        src={displayInfo.content}
                        alt='Scene Image'
                        width={200}
                        height={300}
                        className={styles.image}
                    />
                );

            case 'title':
                return (
                    <div className={styles.titleState}>
                        <div className={styles.titleText}>{displayInfo.content}</div>
                    </div>
                );

            case 'default':
                return (
                    <div className={styles.defaultState}>
                        <div className={styles.defaultText}>{displayInfo.content}</div>
                    </div>
                );

            default:
                return (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyText}>No Image Available</div>
                    </div>
                );
        }
    };

    return (
        <div
            className={`${styles.container} ${scene && !scene.isSelected ? styles.deselected : ''}`}
        >
            {/* Checkbox in top-right corner (only for real scenes) */}
            {scene && (
                <div className={styles.selectionCheckbox} onClick={handleSceneToggle}>
                    <input
                        type='checkbox'
                        checked={scene.isSelected}
                        onChange={() => {}} // Handled by onClick above
                        className={styles.checkbox}
                    />
                </div>
            )}

            {/* Delete button in top-left corner (only for real scenes) */}
            {scene && (
                <DeleteButton
                    onDelete={handleDeleteScene}
                    className={styles.deleteButton}
                    title={'Delete Scene'}
                />
            )}

            {/* Opacity mask for deselected scenes */}
            {scene && !scene.isSelected && <div className={styles.opacityMask} />}

            {/* Main content block */}
            <div
                className={`${styles.block} ${displayInfo.type === 'add' ? styles.addBlock : ''} ${
                    !displayInfo.content ||
                    displayInfo.type === 'title' ||
                    displayInfo.type === 'default'
                        ? styles.emptyBlock
                        : ''
                }`}
                onClick={handleClick}
            >
                {renderContent()}
            </div>
        </div>
    );
};

export default SceneBlock;
