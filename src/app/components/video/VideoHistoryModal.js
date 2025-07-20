"use client";

import styles from "./VideoHistoryModal.module.css";

const VideoHistoryModal = ({
    isOpen,
    sceneDisplayName,
    sceneClips = [],
    selectedSceneClipId = null,
    onClose,
    onSelectClip,
}) => {
    if (!isOpen) return null;

    const handleClipClick = (clipId) => {
        if (onSelectClip) {
            onSelectClip(clipId);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Video History - {sceneDisplayName}</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.videoGrid}>
                        {/* Existing video clips */}
                        {sceneClips.map((clipItem, index) => {
                            const isSelected = selectedSceneClipId === clipItem.id;

                            return (
                                <div
                                    key={clipItem.id}
                                    className={`${styles.videoItem} ${
                                        isSelected ? styles.selected : ''
                                    }`}
                                    onClick={() => handleClipClick(clipItem.id)}
                                >
                                    <div className={styles.videoContainer}>
                                        <video
                                            src={clipItem.gcsUrl}
                                            className={styles.video}
                                            preload="metadata"
                                            muted
                                        />
                                        <div className={styles.playOverlay}>
                                            <div className={styles.playButton}>▶</div>
                                        </div>
                                    </div>
                                    <div className={styles.videoLabel}>
                                        🎬 Generated {index + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Show empty state when no clips */}
                    {sceneClips.length === 0 && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>🎬</div>
                            <p className={styles.emptyText}>No video clips yet</p>
                            <p className={styles.emptySubtext}>
                                Generate video clips to see them here
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoHistoryModal;
