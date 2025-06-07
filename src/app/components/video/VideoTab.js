"use client";

import { useState, useMemo, useRef } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import { FaMagic, FaVideo } from 'react-icons/fa';
import styles from './VideoTab.module.css';
import VideoRow from './VideoRow';
import FullSizeImageModal from '../common/FullSizeImageModal';
import StoryConfigModal from '../common/StoryConfigModal';
import { analyzeImageForVideo, generateVideo, getVideoTaskStatus } from '../../../services/backend';

const VideoTab = ({ projectId, generatedImages, onBackToRemake, onNext, onError }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    imageUrl: null,
    imageTitle: null
  });

  const [isPromptGenAllRunning, setIsPromptGenAllRunning] = useState(false);
  const [isVideoGenAllRunning, setIsVideoGenAllRunning] = useState(false);

  // Scene-specific state
  const [sceneData, setSceneData] = useState({});

  // Generated videos array for next tab (using ref for performance)
  const generatedVideosRef = useRef([]);

  const [storyConfig, setStoryConfig] = useState({
    isModalOpen: false,
    storyDescription: '',
    changeRequest: '',
    hasBeenSet: false
  });

  // Process generated images from RemakeTab
  const inputImages = useMemo(() => {
    if (!generatedImages || !Array.isArray(generatedImages)) {
      return [];
    }

    // Initialize scene data if not already present
    generatedImages.forEach(item => {
      if (!sceneData[item.sceneId]) {
        setSceneData(prev => ({
          ...prev,
          [item.sceneId]: {
            prompt: item.revisedPrompt || '',
            generatedVideo: null,
            taskId: null,
            isPromptAssistantRunning: false,
            isGenerating: false
          }
        }));
      }
    });

    return generatedImages.map(item => ({
      sceneId: item.sceneId,
      imageUrl: item.image,
      title: `${item.sceneId} Input`,
      revisedPrompt: item.revisedPrompt
    }));
  }, [generatedImages]);

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

  const handleStoryConfigSave = (configData) => {
    setStoryConfig(prev => ({
      ...prev,
      isModalOpen: false,
      storyDescription: configData.storyDescription,
      changeRequest: configData.changeRequest,
      hasBeenSet: true
    }));
  };

  const handleStoryConfigSkip = () => {
    setStoryConfig(prev => ({
      ...prev,
      isModalOpen: false,
      hasBeenSet: true
    }));
  };

  const handleStoryConfigClose = () => {
    setStoryConfig(prev => ({
      ...prev,
      isModalOpen: false
    }));
  };

  const handleSettingsClick = () => {
    setStoryConfig(prev => ({
      ...prev,
      isModalOpen: true
    }));
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
        scene.revisedPrompt,
        storyConfig.storyDescription || null,
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

  const pollVideoStatus = async (taskId, sceneId) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const result = await getVideoTaskStatus(taskId);
        
        if (result.data?.task_status === 'succeed' && result.data?.task_result?.videos?.[0]) {
          // Video generation completed successfully
          const videoUrl = result.data.task_result.videos[0].url || result.data.task_result.videos[0].resource;
          
          setSceneData(prev => ({
            ...prev,
            [sceneId]: {
              ...prev[sceneId],
              generatedVideo: videoUrl,
              isGenerating: false
            }
          }));

          // Add to generated videos array for next tab
          const filtered = generatedVideosRef.current.filter(vid => vid.sceneId !== sceneId);
          generatedVideosRef.current = [...filtered, {
            sceneId,
            prompt: sceneData[sceneId]?.prompt || '',
            video: videoUrl
          }];

          return;
        } else if (result.data?.task_status === 'failed') {
          throw new Error('Video generation failed');
        } else if (attempts >= maxAttempts) {
          throw new Error('Video generation timed out');
        }

        // Continue polling
        setTimeout(poll, 5000);
      } catch (error) {
        console.error('Error polling video status:', error);
        setSceneData(prev => ({
          ...prev,
          [sceneId]: {
            ...prev[sceneId],
            isGenerating: false
          }
        }));
        if (onError) onError(`Error generating video for ${sceneId}: ${error.message}`);
      }
    };

    poll();
  };

  const handleGenerate = async (sceneId) => {
    const scene = inputImages.find(img => img.sceneId === sceneId);
    const prompt = sceneData[sceneId]?.prompt;
    
    if (!scene?.imageUrl || !prompt || sceneData[sceneId]?.isGenerating) return;

    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        isGenerating: true
      }
    }));

    try {
      // Extract base64 data from data URL
      const base64Data = scene.imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const result = await generateVideo(base64Data, prompt);
      
      if (result.data?.task_id) {
        // Store task ID and start polling
        setSceneData(prev => ({
          ...prev,
          [sceneId]: {
            ...prev[sceneId],
            taskId: result.data.task_id
          }
        }));

        // Start polling for video completion
        pollVideoStatus(result.data.task_id, sceneId);
      } else {
        throw new Error('No task ID returned from video generation');
      }
    } catch (error) {
      console.error('Error generating video:', error);
      setSceneData(prev => ({
        ...prev,
        [sceneId]: {
          ...prev[sceneId],
          isGenerating: false
        }
      }));
      if (onError) onError(`Error generating video for ${sceneId}: ${error.message}`);
    }
  };

  const handlePromptGenAll = async () => {
    if (isPromptGenAllRunning) return;
    setIsPromptGenAllRunning(true);
    
    try {
      for (const scene of inputImages) {
        await handlePromptAssistant(scene.sceneId);
      }
    } catch (error) {
      console.error("Error during PromptGen All:", error);
      if (onError) onError("An error occurred during Prompt Generation for all scenes.");
    } finally {
      setIsPromptGenAllRunning(false);
    }
  };

  const handleVideoGenAll = async () => {
    if (isVideoGenAllRunning) return;
    setIsVideoGenAllRunning(true);
    
    try {
      for (const scene of inputImages) {
        await handleGenerate(scene.sceneId);
      }
    } catch (error) {
      console.error("Error during VideoGen All:", error);
      if (onError) onError("An error occurred during Video Generation for all scenes.");
    } finally {
      setIsVideoGenAllRunning(false);
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
            onClick={handleVideoGenAll}
            className={`${styles.actionButton} ${styles.videoGenButton} ${isVideoGenAllRunning ? styles.disabled : ''}`}
            disabled={isVideoGenAllRunning}
            title="Generate Videos for All Scenes"
          >
            <FaVideo /> {isVideoGenAllRunning ? 'Generating Videos...' : 'VideoGen All'}
          </button>
          <button
            onClick={handleSettingsClick}
            className={styles.settingsButton}
            title="Story Configuration"
          >
            <IoSettingsOutline />
          </button>
        </div>
        <button 
          onClick={() => onNext && onNext(generatedVideosRef.current)}
          className={styles.stepButton}
        >
          Next Step →
        </button>
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
              onGenerate={handleGenerate}
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

      <StoryConfigModal
        isOpen={storyConfig.isModalOpen}
        storyDescription={storyConfig.storyDescription}
        changeRequest={storyConfig.changeRequest}
        onSave={handleStoryConfigSave}
        onSkip={handleStoryConfigSkip}
        onClose={handleStoryConfigClose}
      />
    </div>
  );
};

export default VideoTab;
