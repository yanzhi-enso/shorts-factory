"use client";

import { useState, useCallback } from 'react';
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
    storyConfig,
    videoManager,
    onInputImageClick,
}) => {
    const { addGeneratedClip, updateSelectedGeneratedClip } = useProjectManager();
    const { id: sceneId, selectedGeneratedImage, generatedImages, selectedSceneClip, sceneClips, selectedSceneClipId } = scene;
    
    // Dynamic display name based on array position
    const sceneDisplayName = `Scene-${sceneIndex + 1}`;

    // Internal state for this specific scene row
    const [prompt, setPrompt] = useState('');
    const [isPromptAssistantRunning, setIsPromptAssistantRunning] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [error, setError] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

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
                setIsGeneratingVideo(true);
                setError(null);
            } else if (update.status === 'succeed' && update.videoUrl) {
                setIsGeneratingVideo(false);
                // Add generated clip to ProjectManager with prompt in generation sources
                addGeneratedClip(sceneId, update.videoUrl, {
                    prompt: prompt,
                    // Add other generation sources if available
                });
            }
        },
        [sceneId, prompt, addGeneratedClip]
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

    const handleSelectFromHistory = async (selectedClipId) => {
        if (updateSelectedGeneratedClip) {
            await updateSelectedGeneratedClip(selectedClipId);
        }
        setHistoryModalOpen(false);
    };

    const inputImage = {
        imageUrl: selectedGeneratedImage,
        title: `${sceneDisplayName} Input`,
    };

    return (
        <div className={styles.videoRow}>
            {/* Input Image */}
            <div className={styles.imageSection}>
                <RemakeImageBlock
                    imageUrl={inputImage.imageUrl}
                    title={inputImage.title}
                    variant='original'
                    onClick={() => handleInputImageClick(inputImage.imageUrl, inputImage.title)}
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
                onSelectClip={handleSelectFromHistory}
            />
        </div>
    );
};

export default VideoRow;
