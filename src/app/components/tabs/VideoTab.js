"use client";

import { useState, useMemo } from 'react';
import { FaMagic, FaVideo, FaDownload, FaBookOpen } from 'react-icons/fa';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './VideoTab.module.css';
import VideoRow from '../video/VideoRow';
import FullSizeImageModal from '../common/FullSizeImageModal';
import VideoRequestManager from '../video/VideoRequestManager';
import { useProjectManager } from 'hocs/ProjectManager';

const VideoTabContent = ({ onBackToRemake, onError, videoManager, onSettingsClick }) => {
    const { projectState } = useProjectManager();
    const [modalState, setModalState] = useState({
        isOpen: false,
        imageUrl: null,
        imageTitle: null,
    });

    const [isExporting, setIsExporting] = useState(false);

    const storyConfig = projectState.currentProject?.settings || {};

    // Filter scenes that have a selected generated image to be shown in this tab
    const scenesForVideo = useMemo(() => {
        if (!projectState.scenes || !Array.isArray(projectState.scenes)) {
            return [];
        }
        return projectState.scenes.filter((scene) => scene.selectedGeneratedImage);
    }, [projectState.scenes]);

    const handleInputImageClick = (imageUrl, title) => {
        setModalState({
            isOpen: true,
            imageUrl,
            imageTitle: title,
        });
    };

    const handleGeneratedVideoClick = (videoUrl, title) => {
        if (videoUrl) {
            setModalState({
                isOpen: true,
                imageUrl: videoUrl,
                imageTitle: title,
            });
        }
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            imageUrl: null,
            imageTitle: null,
        });
    };

    // Placeholder for bulk operation
    const handlePromptGenAll = () => {
        console.log('PromptGen All button clicked - no action implemented.');
        if (onError) onError('PromptGen All is not yet implemented.');
    };

    // Placeholder for bulk operation
    const handleVideoGenAll = () => {
        console.log('VideoGen All button clicked - no action implemented.');
        if (onError) onError('VideoGen All is not yet implemented.');
    };

    const handleExport = async () => {
        if (isExporting) return;

        // Get scenes with generated videos directly from project state
        const videosToExport = scenesForVideo.filter((scene) => scene.selectedSceneClip);

        if (videosToExport.length === 0) {
            alert('No generated videos to export. Please generate some videos first.');
            return;
        }

        setIsExporting(true);

        try {
            const zip = new JSZip();

            for (const scene of videosToExport) {
                try {
                    const response = await fetch(scene.selectedSceneClip);
                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch video for Scene ${scene.id}: ${response.statusText}`
                        );
                    }
                    const videoBlob = await response.blob();
                    zip.file(`scene_${scene.id}_video.mp4`, videoBlob);
                } catch (error) {
                    console.error(error);
                    // Continue with other videos even if one fails
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            saveAs(content, `video_export_${timestamp}.zip`);
        } catch (error) {
            console.error('Error creating export:', error);
            if (onError) onError('Failed to export videos. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={onBackToRemake} className={styles.stepButton}>
                    ← Back to Remake
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
                    <button
                        onClick={handlePromptGenAll}
                        className={`${styles.actionButton} ${styles.promptButton}`}
                        title='Generate Prompts for All Scenes'
                    >
                        <FaMagic /> PromptGen All
                    </button>
                    <button
                        onClick={handleVideoGenAll}
                        className={`${styles.actionButton} ${styles.videoGenButton}`}
                        title='Generate Videos for All Scenes'
                    >
                        <FaVideo /> VideoGen All
                    </button>
                </div>
                <div className={styles.rightButtons}>
                    <button
                        onClick={handleExport}
                        className={`${styles.actionButton} ${styles.exportButton} ${
                            isExporting ? styles.disabled : ''
                        }`}
                        disabled={isExporting}
                        title='Export Generated Videos'
                    >
                        <FaDownload /> {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                </div>
            </div>

            <div className={styles.rowsContainer}>
                {scenesForVideo.map((scene) => (
                    <VideoRow
                        key={scene.id}
                        scene={scene}
                        storyConfig={storyConfig}
                        videoManager={videoManager}
                        onInputImageClick={handleInputImageClick}
                        onGeneratedVideoClick={handleGeneratedVideoClick}
                    />
                ))}
            </div>

            <FullSizeImageModal
                isOpen={modalState.isOpen}
                imageUrl={modalState.imageUrl}
                imageTitle={modalState.imageTitle}
                onClose={closeModal}
            />
        </div>
    );
};

// Wrapper component that integrates VideoRequestManager
const VideoTab = (props) => {
    return (
        <VideoRequestManager onError={props.onError}>
            {(enhancedProps) => (
                <VideoTabContent {...props} videoManager={enhancedProps.videoManager} />
            )}
        </VideoRequestManager>
    );
};

export default VideoTab;
