"use client";

import { useState } from 'react';
import styles from './StartTab.module.css';
import LoadingSpinner from '../common/LoadingSpinner';

const StartTab = ({ onProcessComplete, onError }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProcessVideo = async () => {
    if (!videoUrl) {
      setError('Please enter a video URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend API to start processing
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to process video');
      }

      const data = await response.json();
      
      // Fetch file list via backend proxy to avoid CORS issues
      const fileListResponse = await fetch(`/api/files/${data.project_id}`);
      if (!fileListResponse.ok) {
        throw new Error('Failed to fetch file list');
      }
      
      const fileData = await fileListResponse.json();
      
      // Call parent callback with success data
      onProcessComplete({
        projectId: data.project_id,
        images: fileData.files
      });
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default StartTab;
