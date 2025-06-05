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
  onOriginalImageClick,
  onGeneratedImageClick
}) => {
  const [prompt, setPrompt] = useState('');
  const [gptPolishEnabled, setGptPolishEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const handlePromptChange = (newPrompt) => {
    setPrompt(newPrompt);
  };

  const handleGptPolishToggle = (enabled) => {
    setGptPolishEnabled(enabled);
  };

  const handleGenerate = () => {
    // Empty handler for now - will be implemented later
    console.log('Generate clicked for scene:', sceneId);
    console.log('Prompt:', prompt);
    console.log('GPT Polish:', gptPolishEnabled);
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
            gptPolishEnabled={gptPolishEnabled}
            onGptPolishToggle={handleGptPolishToggle}
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
