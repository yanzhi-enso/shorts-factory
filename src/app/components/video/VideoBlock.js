import React, { useState, useRef } from 'react';
import styles from './VideoBlock.module.css';

const VideoBlock = ({ 
  videoUrl, 
  title, 
  onClick, 
  variant = 'generated', // 'generated', 'empty'
  isEmpty = false,
  isGenerating = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef(null);

  const handleClick = () => {
    if (onClick && videoUrl) {
      onClick(videoUrl, title, variant);
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleVideoLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Generating video...</div>
        </div>
      );
    }

    if (isEmpty || !videoUrl) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>
            Generate to see video
          </div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className={styles.errorState}>
          <div className={styles.errorText}>
            Failed to load video
          </div>
        </div>
      );
    }

    return (
      <div className={styles.videoContainer}>
        {isLoading && (
          <div className={styles.videoLoading}>
            <div className={styles.spinner}></div>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className={styles.video}
          onLoadStart={handleVideoLoadStart}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          preload="metadata"
        />
      </div>
    );
  };

  return (
    <div 
      className={`${styles.videoBlock} ${isEmpty ? styles.empty : ''} ${isGenerating ? styles.generating : ''} ${styles[variant]}`} 
      onClick={handleClick}
    >
      {renderContent()}
    </div>
  );
};

export default VideoBlock;
