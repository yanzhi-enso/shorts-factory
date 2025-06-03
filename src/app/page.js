"use client";

import { useState } from 'react';
import Image from "next/image";
import styles from "./page.module.css";
import ImageGrid from './components/ImageGrid';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [images, setImages] = useState([]);

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
      
      // Filter to only show first image from each scene group
      const filteredImages = fileData.files.filter(file => 
        file.includes('-01.jpg') || file.includes('-01.jpeg')
      );
      
      setImages(filteredImages);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>TikTok Video Processor</h1>
        
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Enter TikTok video URL"
            className={styles.input}
            disabled={loading}
          />
          <button
            onClick={handleProcessVideo}
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Process Video'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {projectId && !loading && !error && (
          <div className={styles.results}>
            <h2>Scene Thumbnails</h2>
            <p className={styles.projectId}>Project ID: {projectId}</p>
            {images.length > 0 ? (
              <ImageGrid images={images} />
            ) : (
              <p>No images found for this project</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
