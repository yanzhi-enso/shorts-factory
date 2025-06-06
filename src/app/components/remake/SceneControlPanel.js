"use client";

import { useState } from 'react';
import styles from './SceneControlPanel.module.css';
import Image from 'next/image';

const SceneControlPanel = ({ 
  prompt = '', 
  onPromptChange, 
  onPromptAssistant,
  isPromptAssistantRunning = false,
  referenceImages = [],
  onGenerate,
  isGenerating = false
}) => {
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

        {/* Generate Button */}
        <button
          className={`${styles.generateButton} ${isGenerating ? styles.generating : ''}`}
          onClick={handleGenerateClick}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
};

export default SceneControlPanel;
