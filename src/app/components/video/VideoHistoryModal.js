"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from "./VideoHistoryModal.module.css";

const VideoHistoryModal = ({
    isOpen,
    sceneDisplayName,
    sceneClips = [],
    selectedSceneClipId = null,
    onClose,
    onUpdateSelection,
}) => {
    // Local state for modal interactions
    const [selectedRecordId, setSelectedRecordId] = useState(selectedSceneClipId);

    // Update local state when props change
    useEffect(() => {
        if (selectedSceneClipId) {
            setSelectedRecordId(selectedSceneClipId);
        } else if (sceneClips.length > 0) {
            // If no selection but clips exist, select first one
            setSelectedRecordId(sceneClips[0].id);
        }
    }, [selectedSceneClipId, sceneClips]);

    if (!isOpen) return null;

    // Get current selected record
    const selectedRecord = sceneClips.find((clip) => clip.id === selectedRecordId);

    const handleRecordSelect = (clipId) => {
        setSelectedRecordId(clipId);
    };

    const handleSave = async () => {
        try {
            // Update scene's selected clip if changed
            if (selectedRecordId !== selectedSceneClipId && onUpdateSelection) {
                await onUpdateSelection(selectedRecordId);
            }
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save changes');
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Video History - {sceneDisplayName}</h3>
                    <button className={styles.closeButton} onClick={handleCancel}>
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.mainContent}>
                        {/* Left Column - Clip List */}
                        <div className={styles.leftColumn}>
                            <div className={styles.recordList}>
                                {sceneClips.map((clipItem, index) => {
                                    const isSelected = selectedRecordId === clipItem.id;

                                    return (
                                        <div
                                            key={clipItem.id}
                                            className={`${styles.recordItem} ${
                                                isSelected ? styles.selected : ''
                                            }`}
                                            onClick={() => handleRecordSelect(clipItem.id)}
                                        >
                                            <div className={styles.recordThumbnail}>
                                                <video
                                                    src={clipItem.gcsUrl}
                                                    className={styles.recordVideo}
                                                    preload='metadata'
                                                    muted
                                                />
                                            </div>
                                            <div className={styles.recordInfo}>
                                                <div className={styles.recordLabel}>
                                                    🎬 Generated #{index + 1}
                                                </div>
                                                <div className={styles.recordDate}>
                                                    {formatDate(clipItem.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Column - Details */}
                        <div className={styles.rightColumn}>
                            {selectedRecord ? (
                                <div className={styles.detailsPanel}>
                                    {/* Row 1 - Video Player */}
                                    <div className={styles.videoPlayerRow}>
                                        <video
                                            src={selectedRecord.gcsUrl}
                                            className={styles.videoPlayer}
                                            controls
                                            preload='metadata'
                                            muted
                                        />
                                    </div>

                                    {/* Row 2 - Split Layout: Prompt + Source Image */}
                                    <div className={styles.splitRow}>
                                        {/* Prompt Section (Left) */}
                                        {selectedRecord.generationSources?.prompt && (
                                            <div className={styles.promptSection}>
                                                <div className={styles.promptLabel}>Prompt:</div>
                                                <div className={styles.promptText}>
                                                    {selectedRecord.generationSources.prompt}
                                                </div>
                                            </div>
                                        )}

                                        {/* Source Image Section (Right) */}
                                        {selectedRecord.generationSources?.img_url && (
                                            <div className={styles.imageSection}>
                                                <Image
                                                    src={selectedRecord.generationSources.img_url}
                                                    alt='Source image'
                                                    width={120}
                                                    height={180}
                                                    className={styles.sourceImage}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.placeholderContent}>
                                    <div className={styles.placeholderIcon}>🎬</div>
                                    <p className={styles.placeholderText}>No video clips yet</p>
                                    <p className={styles.placeholderSubtext}>
                                        Generate video clips to see them here
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className={styles.actionPanel}>
                        <button className={styles.cancelButton} onClick={handleCancel}>
                            Cancel
                        </button>
                        <button
                            className={styles.saveButton}
                            onClick={handleSave}
                            disabled={!selectedRecord}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoHistoryModal;
