"use client";

import { FaBookOpen } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import styles from './ScenesTab.module.css';
import ImageGrid from 'app/components/scenes/ImageGrid';

const ScenesTab = ({ onBackToStart, onNext, onError, onSettingsClick }) => {
    const { projectState } = useProjectManager();

    // Get data from ProjectManager instead of props
    const scenes = projectState.scenes || [];

    const handleNext = () => {
        onNext();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button
                    onClick={onBackToStart}
                    className={styles.stepButton}
                >
                    ← Back to Start
                </button>
                <div className={styles.centerButtons}>
                    <button
                        onClick={onSettingsClick}
                        className={`${styles.actionButton} ${styles.settingsButton}`}
                        title='Story Configuration'
                    >
                        <FaBookOpen />
                        Story Setting
                    </button>
                </div>
                <button
                    onClick={handleNext}
                    className={styles.stepButton}
                >
                    Next Step →
                </button>
            </div>

            <div className={styles.instructionRow}>
                <p className={styles.projectId}>
                    {scenes.filter(scene => scene.isSelected).length}/{scenes.length} Scenes selected
                </p>
            </div>

            <div className={styles.content}>
                <ImageGrid scenes={scenes}/>
            </div>
        </div>
    );
};

export default ScenesTab;
