"use client";

import { useState } from 'react';
import styles from './VideoRow.module.css';
import VideoBlock from './VideoBlock';
import RemakeImageBlock from '../remake/RemakeImageBlock';
import SceneControlPanel from '../remake/SceneControlPanel';

const VideoRow = ({
  sceneId,
  inputImage,
  generatedVideo = null,
  prompt = '',
  isPromptAssistantRunning = false,
  isGenerating = false,
  onInputImageClick,
  onGeneratedVideoClick,
  onPromptChange,
  onPromptAssistant,
  onGenerate
}) => {
  const handlePromptChange = (newPrompt) => {
    if (onPromptChange) {
      onPromptChange(sceneId, newPrompt);
    }
  };

  const handlePromptAssistant = () => {
    if (onPromptAssistant) {
      onPromptAssistant(sceneId);
    }
  };

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate(sceneId);
    }
  };

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

  return (
    <div className={styles.videoRow}>
      {/* Input Image */}
      <div className={styles.imageSection}>
        <RemakeImageBlock
          imageUrl={inputImage.imageUrl}
          title={inputImage.title}
          variant="original"
          onClick={handleInputImageClick}
        />
      </div>

      {/* Control Panel */}
      <div className={styles.controlSection}>
        <SceneControlPanel
          prompt={prompt}
          onPromptChange={handlePromptChange}
          onPromptAssistant={handlePromptAssistant}
          isPromptAssistantRunning={isPromptAssistantRunning}
          referenceImages={[]} // Will be populated later if needed
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </div>

      {/* Generated Video */}
      <div className={styles.videoSection}>
        <VideoBlock
          videoUrl={generatedVideo}
          title={generatedVideo ? `${sceneId} Generated Video` : ''}
          variant="generated"
          isEmpty={!generatedVideo}
          isGenerating={isGenerating}
          onClick={handleGeneratedVideoClick}
        />
      </div>
    </div>
  );
};

export default VideoRow;
