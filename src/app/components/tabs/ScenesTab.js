"use client";

import { FaBookOpen } from 'react-icons/fa';
import { useProjectManager } from 'projectManager/useProjectManager';
import styles from './ScenesTab.module.css';
import ImageGrid from '../scenes/ImageGrid';

const ScenesTab = ({ onBackToStart, onNext, onError, onSettingsClick }) => {
    const { projectState } = useProjectManager();

    // Get data from ProjectManager instead of props
    const scenes = projectState.scenes || [];

    const handleNext = () => {
        // Validation: check if any scenes are selected
        if (!scenes.some(scene => scene.isSelected)) {
            onError('Please select at least one scene to continue');
            return;
        }

        onNext();
    };

    const hasSelectedScenes = scenes.some(scene => scene.isSelected);

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
                        Story Context
                    </button>
                </div>
                <button
                    onClick={handleNext}
                    className={`${styles.stepButton} ${!hasSelectedScenes ? styles.disabled : ''}`}
                    disabled={!hasSelectedScenes}
                >
                    Next Step →
                </button>
            </div>

            <div className={styles.instructionRow}>
                <p className={styles.projectId}>Pick scenes and their index images for next step.</p>
            </div>

            <div className={styles.content}>
                {scenes.length > 0 ? (
                    <ImageGrid scenes={scenes}/>
                ) : (
                    <p className={styles.noImages}>No scenes found for this project</p>
                )}
            </div>
        </div>
    );
};

export default ScenesTab;
