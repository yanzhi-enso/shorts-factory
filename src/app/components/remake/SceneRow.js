"use client";

import styles from './SceneRow.module.css';
import RemakeImageBlock from './RemakeImageBlock';
import GeneratedImageBlock from './GeneratedImageBlock';
import SceneControlPanel from './SceneControlPanel';

const SceneRow = ({
  sceneId,
  originalImage,
  selectedImage = null,
  imageHistory = [],
  selectedImageIndex = -1,
  prompt = '',
  imageCount = 1,
  isPromptAssistantRunning = false,
  isGenerating = false,
  onOriginalImageClick,
  onPromptChange,
  onPromptAssistant,
  onGenerate,
  onImageUpload,
  onImageSelect,
  onImageCountChange
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

  const handleOriginalClick = (imageUrl, title) => {
    if (onOriginalImageClick) {
      onOriginalImageClick(imageUrl, title);
    }
  };

  return (
    <div className={styles.sceneRow}>
      {/* Original Image */}
      <div className={styles.imageSection}>
        <RemakeImageBlock
          imageUrl={originalImage.imageUrl}
          title={originalImage.title}
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
          imageCount={imageCount}
          onImageCountChange={(newCount) => onImageCountChange && onImageCountChange(sceneId, newCount)}
        />
      </div>

      {/* Generated Image */}
      <div className={styles.imageSection}>
        <GeneratedImageBlock
          sceneId={sceneId}
          selectedImage={selectedImage}
          imageHistory={imageHistory}
          selectedImageIndex={selectedImageIndex}
          onImageUpload={onImageUpload}
          onImageSelect={onImageSelect}
        />
      </div>
    </div>
  );
};

export default SceneRow;
