"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FaMagic, FaVideo, FaDownload, FaBookOpen, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './VideoTab.module.css';
import FullscreenImageModal from 'app/components/common/FullscreenImageModal';
import VideoRow from 'app/components/video/VideoRow';
import VideoRequestManager from 'app/components/video/VideoRequestManager';
import { useProjectManager } from 'projectManager/useProjectManager';

const VideoTabContent = ({
    onBackToRemake,
    onError,
    videoManager,
    onSettingsClick,
    onExportStart,
    onExportEnd,
}) => {
    const { projectState } = useProjectManager();
    const [modalState, setModalState] = useState({
        isOpen: false,
        imageUrl: null,
        imageTitle: null,
    });

    const [isExporting, setIsExporting] = useState(false);

    // Centralized collapse state management
    const [videoCollapseStates, setVideoCollapseStates] = useState({});
    const [bulkCollapseState, setBulkCollapseState] = useState('mixed');

    const storyConfig = projectState.currentProject?.settings || {};

    // Filter scenes that have a selected generated image to be shown in this tab
    const scenesForVideo = useMemo(() => {
        if (!projectState.scenes || !Array.isArray(projectState.scenes)) {
            return [];
        }
        return projectState.scenes.filter(
            (scene) => scene.isSelected && scene.selectedGeneratedImage
        );
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

    // Individual toggle handler for video collapse
    const toggleVideoCollapse = useCallback((sceneId) => {
        setVideoCollapseStates((prev) => ({
            ...prev,
            [sceneId]: !prev[sceneId],
        }));
    }, []);

    // Bulk collapse/expand handlers
    const handleCollapseAll = useCallback(() => {
        const newStates = {};
        scenesForVideo.forEach((scene) => {
            newStates[scene.id] = true;
        });
        setVideoCollapseStates(newStates);
    }, [scenesForVideo]);

    const handleExpandAll = useCallback(() => {
        const newStates = {};
        scenesForVideo.forEach((scene) => {
            newStates[scene.id] = false;
        });
        setVideoCollapseStates(newStates);
    }, [scenesForVideo]);

    // Real-time bulk state calculation
    useEffect(() => {
        if (scenesForVideo.length === 0) {
            setBulkCollapseState('mixed');
            return;
        }

        const collapsedCount = scenesForVideo.filter(
            (scene) => videoCollapseStates[scene.id] === true
        ).length;

        if (collapsedCount === 0) {
            setBulkCollapseState('expanded');
        } else if (collapsedCount === scenesForVideo.length) {
            setBulkCollapseState('collapsed');
        } else {
            setBulkCollapseState('mixed');
        }
    }, [videoCollapseStates, scenesForVideo]);

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

        // Filter scenes that have a selected scene clip using enriched fields
        const videosToExport = scenesForVideo.filter((scene) => scene.selectedSceneClip);

        if (videosToExport.length === 0) {
            alert('No generated videos to export. Please generate some videos first.');
            return;
        }

        setIsExporting(true);
        if (onExportStart) onExportStart('videos');

        try {
            const zip = new JSZip();

            // Add each selected video to the zip
            for (let i = 0; i < videosToExport.length; i++) {
                const scene = videosToExport[i];
                const sceneDisplayName = `Scene-${i + 1}`;

                try {
                    const response = await fetch(scene.selectedSceneClip);
                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch video for ${sceneDisplayName}: ${response.statusText}`
                        );
                    }
                    const videoBlob = await response.blob();
                    zip.file(`scene-${i + 1}.mp4`, videoBlob);
                } catch (error) {
                    console.error(`Error processing video for ${sceneDisplayName}:`, error);
                    // Continue with other videos even if one fails
                }
            }

            // Generate and download the zip file
            const content = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            saveAs(content, `video_export_${timestamp}.zip`);
        } catch (error) {
            console.error('Error creating export:', error);
            if (onError) onError('Failed to export videos. Please try again.');
        } finally {
            setIsExporting(false);
            if (onExportEnd) onExportEnd();
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
                        Story Setting
                    </button>
                    <button
                        onClick={handleCollapseAll}
                        className={`${styles.actionButton} ${styles.collapseButton} ${
                            bulkCollapseState === 'collapsed' ? styles.disabled : ''
                        }`}
                        disabled={bulkCollapseState === 'collapsed'}
                        title='Collapse All Video Rows'
                    >
                        <FaChevronUp />
                        Collapse All
                    </button>
                    <button
                        onClick={handleExpandAll}
                        className={`${styles.actionButton} ${styles.expandButton} ${
                            bulkCollapseState === 'expanded' ? styles.disabled : ''
                        }`}
                        disabled={bulkCollapseState === 'expanded'}
                        title='Expand All Video Rows'
                    >
                        <FaChevronDown />
                        Expand All
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
                {scenesForVideo.map((scene, index) => (
                    <VideoRow
                        key={scene.id}
                        scene={scene}
                        sceneIndex={index}
                        totalScenes={scenesForVideo.length}
                        storyConfig={storyConfig}
                        videoManager={videoManager}
                        onInputImageClick={handleInputImageClick}
                        onGeneratedVideoClick={handleGeneratedVideoClick}
                        isCollapsed={videoCollapseStates[scene.id] || false}
                        onToggleCollapse={() => toggleVideoCollapse(scene.id)}
                    />
                ))}
            </div>

            <FullscreenImageModal
                isOpen={modalState.isOpen}
                imageUrl={modalState.imageUrl}
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
