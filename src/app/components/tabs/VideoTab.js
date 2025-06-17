"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { FaMagic, FaVideo, FaDownload } from 'react-icons/fa';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './VideoTab.module.css';
import VideoRow from '../video/VideoRow';
import FullSizeImageModal from '../common/FullSizeImageModal';
import VideoRequestManager from '../video/VideoRequestManager';
import { analyzeImageForVideo } from 'services/backend';
import { useProjectManager } from 'app/hocs/ProjectManager';

const VideoTabContent = ({
  onBackToRemake, onError,
  // videoManager ingested properties
  videoManager, onSceneStateChange, onVideoGenerated,
  // deprecating properties
  storyDescription
}) => {
  const { projectState } = useProjectManager();
  const [modalState, setModalState] = useState({
    isOpen: false,
    imageUrl: null,
    imageTitle: null
  });

  const [isPromptGenAllRunning, setIsPromptGenAllRunning] = useState(false);
  const [isVideoGenAllRunning, setIsVideoGenAllRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Scene-specific state
  const [sceneData, setSceneData] = useState({});

  // Generated videos array for next tab (using ref for performance)
  const generatedVideosRef = useRef([]);

  // Initialize scene data when scenes change
  useEffect(() => {
    if (!projectState.scenes || !Array.isArray(projectState.scenes)) {
      return;
    }

    // Filter scenes that have selected generated images
    const scenesWithGeneratedImages = projectState.scenes.filter(scene => 
      scene.selectedGeneratedImage
    );

    // Initialize scene data if not already present
    scenesWithGeneratedImages.forEach(scene => {
      const sceneIdStr = scene.id.toString();
      if (!sceneData[sceneIdStr]) {
        setSceneData(prev => ({
          ...prev,
          [sceneIdStr]: {
            prompt: '', // Keep blank initially for video prompts
            generatedVideo: null,
            taskId: null,
            isPromptAssistantRunning: false,
            isGenerating: false
          }
        }));
      }
    });
  }, [projectState.scenes]);

  // Process generated images from ProjectManager scenes
  const inputImages = useMemo(() => {
    if (!projectState.scenes || !Array.isArray(projectState.scenes)) {
      return [];
    }

    // Filter scenes that have selected generated images
    const scenesWithGeneratedImages = projectState.scenes.filter(scene => 
      scene.selectedGeneratedImage
    );

    return scenesWithGeneratedImages.map(scene => {
      // Find the selected generated image to get generation sources
      const selectedGeneratedImageData = scene.generatedImages.find(
        img => img.gcsUrl === scene.selectedGeneratedImage
      );
      
      return {
        sceneId: scene.id.toString(),
        imageUrl: scene.selectedGeneratedImage,
        title: `Scene ${scene.id} Input`,
        imagePrompt: selectedGeneratedImageData?.generationSources?.revisedPrompt || '' // Store image generation prompt for context
      };
    });
  }, [projectState.scenes]);

  const handleInputImageClick = (imageUrl, title) => {
    setModalState({
      isOpen: true,
      imageUrl,
      imageTitle: title
    });
  };

  const handleGeneratedVideoClick = (videoUrl, title, variant) => {
    // For now, just handle the same as image click
    // Later this could open a video modal
    if (videoUrl) {
      setModalState({
        isOpen: true,
        imageUrl: videoUrl,
        imageTitle: title
      });
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      imageUrl: null,
      imageTitle: null
    });
  };

  const handlePromptChange = (sceneId, newPrompt) => {
    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        prompt: newPrompt
      }
    }));
  };

  const handlePromptAssistant = async (sceneId) => {
    const scene = inputImages.find(img => img.sceneId === sceneId);
    if (!scene?.imageUrl || sceneData[sceneId]?.isPromptAssistantRunning) return;
    
    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        isPromptAssistantRunning: true
      }
    }));

    try {
      const result = await analyzeImageForVideo(
        scene.imageUrl,
        scene.imagePrompt,
        storyDescription,
        sceneData[sceneId]?.prompt || null
      );
      
      setSceneData(prev => ({
        ...prev,
        [sceneId]: {
          ...prev[sceneId],
          prompt: result
        }
      }));
    } catch (error) {
      console.error('Error with Prompt Assistant:', error);
      if (onError) onError(`Error with Prompt Assistant for ${sceneId}`);
    } finally {
      setSceneData(prev => ({
        ...prev,
        [sceneId]: {
          ...prev[sceneId],
          isPromptAssistantRunning: false
        }
      }));
    }
  };

  // Handle scene state changes from VideoRequestManager
  const handleSceneStateChange = (sceneId, updates) => {
    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        ...updates
      }
    }));
  };

  // Handle video generation completion from VideoRequestManager
  const handleVideoGenerated = (sceneId, videoUrl) => {
    const filtered = generatedVideosRef.current.filter(vid => vid.sceneId !== sceneId);
    generatedVideosRef.current = [...filtered, {
      sceneId,
      prompt: sceneData[sceneId]?.prompt || '',
      video: videoUrl
    }];
  };

  // Connect VideoRequestManager callbacks to local handlers
  useEffect(() => {
    if (onSceneStateChange) {
      // Replace the manager's callback with our local handler
      onSceneStateChange.current = handleSceneStateChange;
    }
    if (onVideoGenerated) {
      // Replace the manager's callback with our local handler
      onVideoGenerated.current = handleVideoGenerated;
    }
  }, [onSceneStateChange, onVideoGenerated]);

  // Enhanced generate function using VideoRequestManager
  const handleGenerate = (sceneId, videoManager) => {
    const scene = inputImages.find(img => img.sceneId === sceneId);
    const prompt = sceneData[sceneId]?.prompt;
    
    if (!scene?.imageUrl || !prompt || sceneData[sceneId]?.isGenerating) return;

    // Queue request through VideoRequestManager
    videoManager.queueRequest(sceneId, scene.imageUrl, prompt);
  };

  const handlePromptGenAll = async () => {
    if (isPromptGenAllRunning) return;
    setIsPromptGenAllRunning(true);
    
    try {
      // Create promises for all scenes simultaneously
      const promptPromises = inputImages.map(scene => 
        handlePromptAssistant(scene.sceneId)
      );
      
      // Execute all in parallel and wait for all to complete/fail
      const results = await Promise.allSettled(promptPromises);
      
      // Handle any failures
      const failures = results
        .map((result, index) => ({ result, sceneId: inputImages[index].sceneId }))
        .filter(({ result }) => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.error("Some prompt generations failed:", failures);
        if (onError) {
          const failedScenes = failures.map(f => f.sceneId).join(', ');
          onError(`Prompt generation failed for scenes: ${failedScenes}`);
        }
      }
    } catch (error) {
      console.error("Error during PromptGen All:", error);
      if (onError) onError("An unexpected error occurred during batch prompt generation.");
    } finally {
      setIsPromptGenAllRunning(false);
    }
  };

  // Enhanced VideoGenAll function using VideoRequestManager
  const handleVideoGenAll = (videoManager) => {
    if (isVideoGenAllRunning) return;
    setIsVideoGenAllRunning(true);
    
    try {
      // Prepare all requests for batch queuing
      const requests = inputImages
        .filter(scene => {
          const prompt = sceneData[scene.sceneId]?.prompt;
          return scene.imageUrl && prompt && !sceneData[scene.sceneId]?.isGenerating;
        })
        .map(scene => ({
          sceneId: scene.sceneId,
          imageBase64: scene.imageUrl,
          prompt: sceneData[scene.sceneId].prompt
        }));

      if (requests.length === 0) {
        if (onError) onError('No scenes ready for video generation. Please ensure all scenes have prompts.');
        setIsVideoGenAllRunning(false);
        return;
      }

      // Queue all requests through VideoRequestManager
      videoManager.queueMultipleRequests(requests);
      
    } catch (error) {
      console.error("Error during VideoGen All:", error);
      if (onError) onError("An unexpected error occurred during batch video generation.");
    } finally {
      setIsVideoGenAllRunning(false);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    
    // Check if there are any generated videos to export
    const generatedVideos = generatedVideosRef.current;
    if (!generatedVideos || generatedVideos.length === 0) {
      alert('No generated videos to export. Please generate some videos first.');
      return;
    }

    setIsExporting(true);
    
    try {
      const zip = new JSZip();
      
      // Add each generated video to the zip
      for (const videoData of generatedVideos) {
        try {
          // Fetch video from URL
          const response = await fetch(videoData.video);
          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
          }
          
          const videoBlob = await response.blob();
          
          // Add video to zip with scene-based filename
          zip.file(`${videoData.sceneId}_generated.mp4`, videoBlob);
        } catch (error) {
          console.error(`Error processing video for ${videoData.sceneId}:`, error);
          // Continue with other videos even if one fails
        }
      }
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      saveAs(content, `video_export_${timestamp}.zip`);
      
    } catch (error) {
      console.error('Error creating export:', error);
      if (onError) onError('Failed to export videos. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={onBackToRemake}
          className={styles.stepButton}
        >
          ← Back to Remake
        </button>
        <div className={styles.centerButtons}>
          <button
            onClick={handlePromptGenAll}
            className={`${styles.actionButton} ${styles.promptButton} ${isPromptGenAllRunning ? styles.disabled : ''}`}
            disabled={isPromptGenAllRunning}
            title="Generate Prompts for All Scenes"
          >
            <FaMagic /> {isPromptGenAllRunning ? 'Generating Prompts...' : 'PromptGen All'}
          </button>
          <button
            onClick={() => handleVideoGenAll(videoManager)}
            className={`${styles.actionButton} ${styles.videoGenButton} ${isVideoGenAllRunning ? styles.disabled : ''}`}
            disabled={isVideoGenAllRunning}
            title="Generate Videos for All Scenes"
          >
            <FaVideo /> {isVideoGenAllRunning ? 'Generating Videos...' : 'VideoGen All'}
          </button>
        </div>
        <div className={styles.rightButtons}>
          <button
            onClick={handleExport}
            className={`${styles.actionButton} ${styles.exportButton} ${isExporting ? styles.disabled : ''}`}
            disabled={isExporting}
            title="Export Generated Videos"
          >
            <FaDownload /> {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
      
      <div className={styles.rowsContainer}>
        {inputImages.map((item, index) => {
          const currentSceneData = sceneData[item.sceneId] || {};
          return (
            <VideoRow
              key={`${item.sceneId}-${index}`}
              sceneId={item.sceneId}
              inputImage={{
                imageUrl: item.imageUrl,
                title: item.title
              }}
              generatedVideo={currentSceneData.generatedVideo}
              prompt={currentSceneData.prompt || ''}
              isPromptAssistantRunning={currentSceneData.isPromptAssistantRunning || false}
              isGenerating={currentSceneData.isGenerating || false}
              onInputImageClick={handleInputImageClick}
              onGeneratedVideoClick={handleGeneratedVideoClick}
              onPromptChange={handlePromptChange}
              onPromptAssistant={handlePromptAssistant}
              onGenerate={(sceneId) => handleGenerate(sceneId, videoManager)}
            />
          );
        })}
      </div>

      <FullSizeImageModal
        isOpen={modalState.isOpen}
        imageUrl={modalState.imageUrl}
        imageTitle={modalState.imageTitle}
        onClose={closeModal}
      />
    </div>
  );
};

// Wrapper component that integrates VideoRequestManager
const VideoTab = (props) => {
  // Create refs for the callback functions that VideoTabContent will set
  const sceneStateChangeRef = useRef(null);
  const videoGeneratedRef = useRef(null);

  return (
    <VideoRequestManager
      onError={props.onError}
      onSceneStateChange={(sceneId, updates) => {
        if (sceneStateChangeRef.current) {
          sceneStateChangeRef.current(sceneId, updates);
        }
      }}
      onVideoGenerated={(sceneId, videoUrl) => {
        if (videoGeneratedRef.current) {
          videoGeneratedRef.current(sceneId, videoUrl);
        }
      }}
    >
      {(enhancedProps) => (
        <VideoTabContent
          {...props}
          videoManager={enhancedProps.videoManager}
          onSceneStateChange={sceneStateChangeRef}
          onVideoGenerated={videoGeneratedRef}
        />
      )}
    </VideoRequestManager>
  );
};

export default VideoTab;
