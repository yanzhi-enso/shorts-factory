"use client";

import { useState } from 'react';
import styles from './SceneRow.module.css';
import RemakeImageBlock from './RemakeImageBlock';
import SceneControlPanel from './SceneControlPanel';
import ImageHistoryModal from './ImageHistoryModal';
import { analyzeImage } from '../../../services/backend';

const SceneRow = ({ 
  sceneId,
  originalImage,
  generatedImage = null,
  generationHistory = [],
  storyConfig = {},
  onOriginalImageClick,
  onGeneratedImageClick
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const handlePromptChange = (newPrompt) => {
    setPrompt(newPrompt);
  };

  const handleGptPolish = async () => {
    if (!originalImage?.imageUrl || isPolishing) return;
    
    setIsPolishing(true);
    try {
      const result = await analyzeImage(
        originalImage.imageUrl,
        storyConfig.storyDescription || null,
        prompt || null,
        storyConfig.changeRequest || null
      );
      setPrompt(result);
    } catch (error) {
      console.error('Error polishing scene description:', error);
      // Could add error handling UI here
    } finally {
      setIsPolishing(false);
    }
  };

  const handleGenerate = () => {
    // Empty handler for now - will be implemented later
    console.log('Generate clicked for scene:', sceneId);
    console.log('Prompt:', prompt);
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
            onGptPolish={handleGptPolish}
            isPolishing={isPolishing}
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
