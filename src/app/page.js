"use client";

import { useState } from 'react';
import styles from "./page.module.css";
import ImageGrid from './components/ImageGrid';
import LoadingSpinner from './components/LoadingSpinner';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [images, setImages] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const handleProcessVideo = async () => {
    if (!videoUrl) {
      setError('Please enter a video URL');
      return;
    }

    setLoading(true);
    setError(null);
    setProjectId(null);
    setImages([]);

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
      setProjectId(data.project_id);
      
      // Fetch file list via backend proxy to avoid CORS issues
      const fileListResponse = await fetch(`/api/files/${data.project_id}`);
      if (!fileListResponse.ok) {
        throw new Error('Failed to fetch file list');
      }
      
      const fileData = await fileListResponse.json();
      
      // Now we need all images, not just filtered ones, for the new grouping logic
      setImages(fileData.files);
      setShowResults(true);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScene = (sceneImages) => {
    // Remove all images belonging to the deleted scene
    setImages(prevImages => 
      prevImages.filter(img => !sceneImages.includes(img))
    );
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>TikTok Video Processor</h1>
        
        {/* Show input form only when not loading and not showing results */}
        {!loading && !showResults && (
          <>
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
                Process Video
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}

        {/* Show loading spinner when processing */}
        {loading && <LoadingSpinner />}

        {/* Show results when processing is complete */}
        {showResults && !loading && (
          <div className={styles.results}>
            <h2>Scene Thumbnails</h2>
            <p className={styles.projectId}>Project ID: {projectId}</p>
            {images.length > 0 ? (
              <ImageGrid images={images} onDeleteScene={handleDeleteScene} />
            ) : (
              <p>No images found for this project</p>
            )}
          </div>
        )}

        {/* Show error in results state */}
        {showResults && error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  );
}
