"use client";

import { useState, useCallback } from 'react';
import styles from './VideoRow.module.css';
import VideoBlock from './VideoBlock';
import RemakeImageBlock from '../remake/RemakeImageBlock';
import VideoControlPanel from './VideoControlPanel';
import { useProjectManager } from 'app/hocs/ProjectManager';
import { analyzeImageForVideo } from 'services/backend';

const VideoRow = ({
    scene,
    storyConfig,
    videoManager,
    onInputImageClick,
    onGeneratedVideoClick,
}) => {
    const { updateScene } = useProjectManager();
    const { id: sceneId, selectedGeneratedImage, generatedImages } = scene;

    // Internal state for this specific scene row
    const [prompt, setPrompt] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
    const [isPromptAssistantRunning, setIsPromptAssistantRunning] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [error, setError] = useState(null);

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
                setGeneratedVideoUrl(update.videoUrl);
                setIsGeneratingVideo(false);
                // Persist final video URL and prompt to global state
                updateScene(sceneId, {
                    generatedVideoUrl: update.videoUrl,
                    videoPrompt: prompt,
                });
            }
        },
        [sceneId, prompt, updateScene]
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

    const handleGeneratedVideoClick = (videoUrl, title, variant) => {
        if (onGeneratedVideoClick) {
            onGeneratedVideoClick(videoUrl, title, variant);
        }
    };

    const inputImage = {
        imageUrl: selectedGeneratedImage,
        title: `Scene ${sceneId} Input`,
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
                    videoUrl={generatedVideoUrl}
                    title={generatedVideoUrl ? `${sceneId} Generated Video` : ''}
                    variant='generated'
                    isEmpty={!generatedVideoUrl}
                    isGenerating={isGeneratingVideo}
                    onClick={() =>
                        handleGeneratedVideoClick(generatedVideoUrl, `${sceneId} Generated Video`)
                    }
                />
            </div>
        </div>
    );
};

export default VideoRow;
