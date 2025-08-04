"use client";

import { useState } from 'react';
import styles from './ProjectCreationModal.module.css';
import { IMAGE_SIZE_PORTRAIT, IMAGE_SIZE_LANDSCAPE } from 'constants/image';
import ToggleSwitch from './ToggleSwitch';

const ProjectCreationModal = ({ isOpen, onClose, onCreateProject }) => {
  const [projectName, setProjectName] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [imageMode, setImageMode] = useState(IMAGE_SIZE_PORTRAIT);
  const [isAdvMode, setIsAdvMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      alert('Project name is required');
      return;
    }

    setIsCreating(true);
    
    try {
      await onCreateProject({
        projectName: projectName.trim(),
        tiktokUrl: tiktokUrl.trim() || null,
        storyContext: storyContext.trim() || null,
        imageMode,
        isAdvMode
      });
      
      // Reset form
      setProjectName('');
      setTiktokUrl('');
      setStoryContext('');
      setImageMode(IMAGE_SIZE_PORTRAIT);
      setIsAdvMode(false);
      
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      // Error handling is done in the parent component
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Create New Project</h2>
          <button 
            className={styles.closeButton} 
            onClick={handleClose}
            disabled={isCreating}
          >
            ×
          </button>
        </div>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="projectName" className={styles.label}>
              Project Name <span className={styles.required}>*</span>
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className={styles.input}
              disabled={isCreating}
              required
            />
          </div>

          {isAdvMode && (
            <div className={styles.formGroup}>
              <label htmlFor="tiktokUrl" className={styles.label}>
                TikTok URL <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="tiktokUrl"
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://www.tiktok.com/..."
                className={styles.input}
                disabled={isCreating}
              />
              <p className={styles.helpText}>
                If you want to recreate a video based on existing content, input the TikTok video link
              </p>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="storyContext" className={styles.label}>
              Story Context <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="storyContext"
              value={storyContext}
              onChange={(e) => setStoryContext(e.target.value)}
              placeholder="Describe the story, theme, or context for your project..."
              className={styles.textarea}
              disabled={isCreating}
              rows={4}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Image Mode <span className={styles.required}>*</span>
            </label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value={IMAGE_SIZE_PORTRAIT}
                  checked={imageMode === IMAGE_SIZE_PORTRAIT}
                  onChange={(e) => setImageMode(e.target.value)}
                  disabled={isCreating}
                />
                Portrait (1024×1536)
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value={IMAGE_SIZE_LANDSCAPE}
                  checked={imageMode === IMAGE_SIZE_LANDSCAPE}
                  onChange={(e) => setImageMode(e.target.value)}
                  disabled={isCreating}
                />
                Landscape (1536×1024)
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Advanced Mode <span className={styles.optional}>(optional)</span>
            </label>
            <p className={styles.helpText}>
              Enable advanced features and additional configuration options.
            </p>
            <ToggleSwitch
              checked={isAdvMode}
              onChange={(e) => setIsAdvMode(e.target.checked)}
              disabled={isCreating}
              variant="primary"
            />
          </div>

          <div className={styles.buttons}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={isCreating || !projectName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCreationModal;
