"use client";

import { useState, useEffect, useCallback } from 'react';
import { FaChevronLeft } from 'react-icons/fa';
import styles from './VideoRow.module.css';
import VideoBlock from './VideoBlock';
import VideoHistoryModal from './VideoHistoryModal';
import RemakeImageBlock from './RemakeImageBlock';
import VideoControlPanel from './VideoControlPanel';
import { useProjectManager } from 'projectManager/useProjectManager';
import { analyzeImageForVideo } from 'services/backend';

const VideoRow = ({
    scene,
    sceneIndex,
    totalScenes,
    storyConfig,
    isCollapsed,
    videoManager,
    onInputImageClick,
    onToggleCollapse,
}) => {
    const { addGeneratedClip, updateSelectedGeneratedClip } = useProjectManager();
    const {
        id: sceneId,
        selectedGeneratedImage: originalSelectedGeneratedImage,
        generatedImages,
        selectedSceneClip,
        sceneClips,
        selectedSceneClipId,
    } = scene;

    const [selectedGeneratedImage, setSelectedGeneratedImage] = useState(null);

    useEffect(() => {
        setSelectedGeneratedImage(originalSelectedGeneratedImage);
    }, [originalSelectedGeneratedImage]);

    // Dynamic display name based on array position
    const sceneDisplayName = `Scene-${sceneIndex + 1}`;

    // Internal state for this specific scene row
    const [prompt, setPrompt] = useState('');
    const [isPromptAssistantRunning, setIsPromptAssistantRunning] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [error, setError] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    useEffect(() => {
        // backfill scene clips if it's null but the clips array is not empty
        if (sceneClips.length > 0 && (!selectedSceneClipId || !selectedSceneClip)) {
            // Select the first clip by default
            const firstClip = sceneClips[0];
            if (firstClip) {
                updateSelectedGeneratedClip(firstClip.id);
            }
        }
    }, [sceneId, sceneClips, selectedSceneClipId, selectedSceneClip]);

    const handlePromptChange = (newPrompt) => {
        setPrompt(newPrompt);
    };

    const handlePromptAssistant = useCallback(async () => {
        if (!selectedGeneratedImage || isPromptAssistantRunning) return;

        setIsPromptAssistantRunning(true);
        setError(null);
        try {
            const imagePrompt =
                generatedImages.find((img) => img.gcsUrl === selectedGeneratedImage)
                    ?.generationSources?.revisedPrompt || '';
            const result = await analyzeImageForVideo(
                selectedGeneratedImage,
                imagePrompt,
                storyConfig.storyDescription,
                prompt || null
            );
            setPrompt(result);
        } catch (err) {
            console.error('Error with Prompt Assistant:', err);
            setError('Failed to generate prompt.');
        } finally {
            setIsPromptAssistantRunning(false);
        }
    }, [selectedGeneratedImage, isPromptAssistantRunning, generatedImages, storyConfig, prompt]);

    const handleVideoUpdate = useCallback(
        (update) => {
            if (update.status === 'queued') {
                console.log('Video generation queued for scene:', sceneId);
                setIsGeneratingVideo(true);
                setError(null);
            } else if (update.status === 'succeed') {
                const { videoUrl, prompt, imageUrl } = update;
                console.log('received video update:', videoUrl, prompt, imageUrl);
                setIsGeneratingVideo(false);
                // Add generated clip to ProjectManager with prompt in generation sources
                addGeneratedClip(sceneId, videoUrl, {
                    prompt,
                    imageUrl,
                });
            }
        },
        [sceneId, setIsGeneratingVideo, addGeneratedClip]
    );

    const handleFillinInput = useCallback(
        (imageUrl, prompt) => {
            console.log('Filling in input for video generation:', imageUrl, prompt);
            if (imageUrl && prompt) {
                setPrompt(prompt);
                setSelectedGeneratedImage(imageUrl);
            }
        },
        [setPrompt]
    );

    const handleVideoError = useCallback((errorMessage) => {
        setIsGeneratingVideo(false);
        setError(errorMessage);
    }, []);

    const handleGenerate = useCallback(() => {
        if (!selectedGeneratedImage || !prompt || isGeneratingVideo) return;

        videoManager.queueRequest(
            sceneId,
            selectedGeneratedImage,
            prompt,
            handleVideoUpdate,
            handleVideoError
        );
    }, [
        sceneId,
        selectedGeneratedImage,
        prompt,
        isGeneratingVideo,
        videoManager,
        handleVideoUpdate,
        handleVideoError,
    ]);

    const handleInputImageClick = (imageUrl, title) => {
        if (onInputImageClick) {
            onInputImageClick(imageUrl, title);
        }
    };

    const handleGeneratedVideoClick = () => {
        // Open history modal instead of the old behavior
        setHistoryModalOpen(true);
    };

    const handleHistoryModalClose = () => {
        setHistoryModalOpen(false);
    };

    const handleUpdateSelection = async (selectedClipId) => {
        if (updateSelectedGeneratedClip) {
            await updateSelectedGeneratedClip(selectedClipId);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.rowHeader}>
                <div className={styles.sceneNumberIndicator}>
                    {sceneIndex + 1}/{totalScenes}
                </div>
                <button
                    onClick={onToggleCollapse}
                    className={styles.toggleButton}
                    title={isCollapsed ? 'Expand video row' : 'Collapse video row'}
                >
                    <FaChevronLeft
                        className={isCollapsed ? styles.chevronExpand : styles.chevronCollapse}
                    />
                </button>
            </div>
            <div className={isCollapsed ? styles.collapsed : styles.content}>
                {/* Input Image */}
                <div className={styles.imageSection}>
                    <RemakeImageBlock
                        imageUrl={selectedGeneratedImage}
                        title={sceneDisplayName + ' Input Image'}
                        variant='original'
                        onClick={handleInputImageClick}
                        showResetButton={originalSelectedGeneratedImage !== selectedGeneratedImage}
                        onResetImageUrl={() =>
                            setSelectedGeneratedImage(originalSelectedGeneratedImage)
                        }
                    />
                </div>

                {/* Control Panel */}
                <div className={styles.controlSection}>
                    <VideoControlPanel
                        prompt={prompt}
                        onPromptChange={handlePromptChange}
                        onPromptAssistant={handlePromptAssistant}
                        isPromptAssistantRunning={isPromptAssistantRunning}
                        referenceImages={[]}
                        onGenerate={handleGenerate}
                        isGenerating={isGeneratingVideo}
                        error={error}
                    />
                </div>

                {/* Generated Video */}
                <div className={styles.videoSection}>
                    <VideoBlock
                        videoUrl={selectedSceneClip}
                        title={selectedSceneClip ? `${sceneDisplayName} Generated Video` : ''}
                        variant='generated'
                        isEmpty={!selectedSceneClip}
                        isGenerating={isGeneratingVideo}
                        sceneClips={sceneClips}
                        selectedSceneClipId={selectedSceneClipId}
                        onHistoryClick={handleGeneratedVideoClick}
                    />
                </div>

                {/* Video History Modal */}
                <VideoHistoryModal
                    isOpen={historyModalOpen}
                    sceneDisplayName={sceneDisplayName}
                    sceneClips={sceneClips}
                    selectedSceneClipId={selectedSceneClipId}
                    onClose={handleHistoryModalClose}
                    onUpdateSelection={handleUpdateSelection}
                    onFillinInput={handleFillinInput}
                />
            </div>
        </div>
    );
};

export default VideoRow;
