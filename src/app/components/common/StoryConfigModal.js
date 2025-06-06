"use client";

import React, { useEffect, useState } from 'react';
import styles from './StoryConfigModal.module.css';

const StoryConfigModal = ({ 
  isOpen, 
  storyDescription = '', 
  changeRequest = '', 
  onSave, 
  onSkip, 
  onClose 
}) => {
  const [formData, setFormData] = useState({
    storyDescription: storyDescription,
    changeRequest: changeRequest
  });

  // Update form data when props change (for editing existing values)
  useEffect(() => {
    setFormData({
      storyDescription: storyDescription,
      changeRequest: changeRequest
    });
  }, [storyDescription, changeRequest]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        
        <div className={styles.header}>
          <h2 className={styles.title}>Story & Change Configuration</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              📖 Story Description
            </label>
            <p className={styles.fieldInfo}>
              Provide a brief description of your story to help the AI model understand the context and recreate images more accurately. This is optional - if left empty, the model will make its best guess, but results may be less precise.
            </p>
            <textarea
              className={styles.textarea}
              value={formData.storyDescription}
              onChange={(e) => handleInputChange('storyDescription', e.target.value)}
              placeholder="Describe your story context here..."
              rows={4}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              🔄 Change Request
            </label>
            <p className={styles.fieldInfo}>
              Describe what changes you'd like to apply to all scenes in your story. This could be style changes, mood adjustments, or specific modifications. This field is also optional.
            </p>
            <textarea
              className={styles.textarea}
              value={formData.changeRequest}
              onChange={(e) => handleInputChange('changeRequest', e.target.value)}
              placeholder="Describe the changes you want to apply..."
              rows={4}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.skipButton} 
            onClick={handleSkip}
          >
            Skip
          </button>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryConfigModal;
