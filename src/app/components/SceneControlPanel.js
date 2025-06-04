"use client";

import { useState } from 'react';
import styles from './SceneControlPanel.module.css';
import Image from 'next/image';

const SceneControlPanel = ({ 
  prompt = '', 
  onPromptChange, 
  gptPolishEnabled = false, 
  onGptPolishToggle,
  referenceImages = [],
  onGenerate,
  isGenerating = false
}) => {
  const handlePromptChange = (e) => {
    if (onPromptChange) {
      onPromptChange(e.target.value);
    }
  };

  const handleToggleChange = () => {
    if (onGptPolishToggle) {
      onGptPolishToggle(!gptPolishEnabled);
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
          placeholder="Describe how you want to modify this scene..."
          value={prompt}
          onChange={handlePromptChange}
          rows={6}
        />
      </div>

      {/* Widget Bar */}
      <div className={styles.widgetBar}>
        {/* GPT Polish Toggle */}
        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={gptPolishEnabled}
              onChange={handleToggleChange}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSlider}></span>
            <span className={styles.toggleText}>GPT Polish</span>
          </label>
        </div>

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
