"use client";

import { useState } from 'react';
import styles from './SceneRow.module.css';
import RemakeImageBlock from './RemakeImageBlock';
import SceneControlPanel from './SceneControlPanel';
import ImageHistoryModal from './ImageHistoryModal';

const SceneRow = ({
  sceneId,
  originalImage,
  generatedImage = null,
  generationHistory = [],
  prompt = '',
  isPromptAssistantRunning = false,
  isGenerating = false,
  onOriginalImageClick,
  onGeneratedImageClick,
  onPromptChange,
  onPromptAssistant,
  onGenerate
}) => {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

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

  const handleOriginalClick = (imageUrl, title) => {
    if (onOriginalImageClick) {
      onOriginalImageClick(imageUrl, title);
    }
  };

  const handleGeneratedClick = (imageUrl, title, variant) => {
    if (variant === 'generated' && generationHistory.length > 0) {
      setHistoryModalOpen(true);
    } else if (onGeneratedImageClick) {
      onGeneratedImageClick(imageUrl, title, variant);
    }
  };

  const handleHistoryModalClose = () => {
    setHistoryModalOpen(false);
  };

  const handleSelectFromHistory = (imageUrl) => {
    // Empty handler for now - will be implemented later
    console.log('Selected from history:', imageUrl);
  };

  return (
    <>
      <div className={styles.sceneRow}>
        {/* Original Image */}
        <div className={styles.imageSection}>
          <RemakeImageBlock
            imageUrl={originalImage.imageUrl}
            title={originalImage.title}
            variant="original"
            onClick={handleOriginalClick}
          />
        </div>

        {/* Control Panel */}
        <div className={styles.controlSection}>
          <SceneControlPanel
            prompt={prompt}
            onPromptChange={handlePromptChange}
            onPromptAssistant={handlePromptAssistant}
            isPromptAssistantRunning={isPromptAssistantRunning}
            referenceImages={[]} // Will be populated later
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>

        {/* Generated Image */}
        <div className={styles.imageSection}>
          <RemakeImageBlock
            imageUrl={generatedImage}
            title={generatedImage ? `${sceneId} Generated` : ''}
            variant="generated"
            isEmpty={!generatedImage}
            onClick={handleGeneratedClick}
          />
        </div>
      </div>

      {/* History Modal */}
      <ImageHistoryModal
        isOpen={historyModalOpen}
        sceneId={sceneId}
        generationHistory={generationHistory}
        onClose={handleHistoryModalClose}
        onSelectImage={handleSelectFromHistory}
      />
    </>
  );
};

export default SceneRow;
