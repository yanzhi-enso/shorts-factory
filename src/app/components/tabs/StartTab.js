"use client";

import { useState } from 'react';
import styles from './StartTab.module.css';
import LoadingSpinner from '../common/LoadingSpinner';
import { useProjectManager } from '../../hocs/ProjectManager';

const StartTab = ({ onProcessComplete, onError }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const { projectState, createProject } = useProjectManager();

  const handleProcessVideo = async () => {
    if (!videoUrl) {
      return;
    }

    const result = await createProject(videoUrl);
    
    if (result.success) {
      // Call parent callback for backward compatibility with TabManager
      // This maintains the existing interface while we transition
      onProcessComplete({
        projectId: result.projectId
      });
    } else {
      if (onError) {
        onError(result.error);
      }
    }
  };

  // Use global loading state from ProjectManager
  if (projectState.loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.inputContainer}>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Enter TikTok video URL"
          className={styles.input}
        />
        <button
          onClick={handleProcessVideo}
          className={styles.button}
        >
          Create Project
        </button>
      </div>
      {/* Show global error from ProjectManager */}
      {projectState.error && <p className={styles.error}>{projectState.error}</p>}
    </div>
  );
};

export default StartTab;
