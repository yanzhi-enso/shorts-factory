"use client";

import styles from './SceneControlPanel.module.css';
import Image from 'next/image';
import Dropdown from '../common/Dropdown';

const SceneControlPanel = ({ 
  prompt = '', 
  onPromptChange, 
  onPromptAssistant,
  isPromptAssistantRunning = false,
  referenceImages = [],
  onGenerate,
  isGenerating = false,
  imageCount = 1,
  onImageCountChange
}) => {
  // Image count options for dropdown
  const imageCountOptions = [
    { value: 1, label: '1 Image' },
    { value: 2, label: '2 Images' },
    { value: 3, label: '3 Images' },
    { value: 4, label: '4 Images' },
    { value: 5, label: '5 Images' }
  ];

  const handlePromptChange = (e) => {
    if (onPromptChange) {
      onPromptChange(e.target.value);
    }
  };

  const handlePromptAssistantClick = () => {
    if (onPromptAssistant && !isPromptAssistantRunning) {
      onPromptAssistant();
    }
  };

  const handleGenerateClick = () => {
    if (onGenerate && !isGenerating) {
      onGenerate();
    }
  };

  return (
    <div className={styles.controlPanel}>
      {/* Text Input Area */}
      <div className={styles.textInputArea}>
        <textarea
          className={styles.promptInput}
          placeholder="Describe what happens in this scene (global changes will also be applied)"
          value={prompt}
          onChange={handlePromptChange}
          disabled={isPromptAssistantRunning}
          rows={6}
        />
      </div>

      {/* Widget Bar */}
      <div className={styles.widgetBar}>
        {/* GPT Polish Button */}
        <button
          className={`${styles.gptPolishButton} ${isPromptAssistantRunning ? styles.polishing : ''}`}
          onClick={handlePromptAssistantClick}
          disabled={isPromptAssistantRunning}
        >
          {isPromptAssistantRunning ? 'Processing...' : 'Prompt Assistant'}
        </button>

        {/* Reference Images */}
        {referenceImages && referenceImages.length > 0 && (
          <div className={styles.referenceImages}>
            {referenceImages.slice(0, 3).map((imageUrl, index) => (
              <div key={index} className={styles.referenceImage}>
                <Image
                  src={imageUrl}
                  alt={`Reference ${index + 1}`}
                  width={40}
                  height={60}
                  className={styles.refImage}
                />
              </div>
            ))}
            {referenceImages.length > 3 && (
              <div className={styles.moreImages}>
                +{referenceImages.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Generate Button with Dropdown */}
        <div className={styles.generateGroup}>
          <button
            className={`${styles.generateButton} ${isGenerating ? styles.generating : ''}`}
            onClick={handleGenerateClick}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
          <Dropdown
            value={imageCount}
            onChange={onImageCountChange}
            disabled={isGenerating}
            options={imageCountOptions}
          />
        </div>
      </div>
    </div>
  );
};

export default SceneControlPanel;
