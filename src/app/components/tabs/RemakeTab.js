"use client";

import { useState, useMemo, useRef } from 'react';
import { FaBookOpen } from "react-icons/fa";
import { FaMagic, FaImages } from 'react-icons/fa';
import styles from './RemakeTab.module.css';
import SceneRow from '../remake/SceneRow';
import FullSizeImageModal from '../common/FullSizeImageModal';
import StoryConfigModal from '../common/StoryConfigModal';
import { analyzeImage, generateImage } from '../../../services/backend';

const RemakeTab = ({
  projectId, images, selectedIndices,
  onBackToScenes, onNext, onError
}) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    imageUrl: null,
    imageTitle: null
  });

  const [isPromptGenAllRunning, setIsPromptGenAllRunning] = useState(false);
  const [isImageGenAllRunning, setIsImageGenAllRunning] = useState(false);

  // Scene-specific state
  const [sceneData, setSceneData] = useState({});

  // Generated images array for next tab (using ref for performance)
  const generatedImagesRef = useRef([]);

  const [storyConfig, setStoryConfig] = useState({
    isModalOpen: true, // Show on first mount
    storyDescription: '',
    changeRequest: '',
    hasBeenSet: false
  });

  // Group images by scene and extract selected images
  const originalImages = useMemo(() => {
    const scenes = {};
    
    // Group images by scene
    images.forEach(imgUrl => {
      const match = imgUrl.match(/video-Scene-(\d+)-(\d+)\./);
      if (match) {
        const sceneId = `Scene-${match[1]}`;
        if (!scenes[sceneId]) {
          scenes[sceneId] = [];
        }
        scenes[sceneId].push(imgUrl);
      }
    });

    // Sort images within each scene
    Object.keys(scenes).forEach(sceneId => {
      scenes[sceneId].sort();
    });

    // Convert to array and extract selected images
    const groupedScenes = Object.entries(scenes).map(([sceneId, sceneImages]) => ({
      sceneId,
      images: sceneImages
    }));

    // Extract selected images for each scene
    const result = groupedScenes.map((scene, index) => {
      const selectedImageIndex = selectedIndices[index] !== undefined ? selectedIndices[index] : 1;
      return {
        sceneId: scene.sceneId,
        imageUrl: scene.images[selectedImageIndex],
        title: `${scene.sceneId} Original`
      };
    }).filter(item => item.imageUrl); // Filter out any undefined images

    // Initialize scene data if not already present
    result.forEach(item => {
      if (!sceneData[item.sceneId]) {
        setSceneData(prev => ({
          ...prev,
          [item.sceneId]: {
            prompt: '',
            generatedImage: null,
            isPromptAssistantRunning: false,
            isGenerating: false
          }
        }));
      }
    });

    return result;
  }, [images, selectedIndices]);

  const handleOriginalImageClick = (imageUrl, title) => {
    setModalState({
      isOpen: true,
      imageUrl,
      imageTitle: title
    });
  };

  const handleGeneratedImageClick = (imageUrl, title, variant) => {
    // For now, just handle the same as original image click
    // Later this will be extended for history modal
    if (imageUrl) {
      setModalState({
        isOpen: true,
        imageUrl,
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
    const scene = originalImages.find(img => img.sceneId === sceneId);
    if (!scene?.imageUrl || sceneData[sceneId]?.isPromptAssistantRunning) return;
    
    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        isPromptAssistantRunning: true
      }
    }));

    try {
      const result = await analyzeImage(
        scene.imageUrl,
        storyConfig.storyDescription || null,
        storyConfig.changeRequest || null,
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

  const handleGenerate = async (sceneId) => {
    const scene = originalImages.find(img => img.sceneId === sceneId);
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
      // Use correct backend API signature: generateImage(prompt, n = 1)
      const result = await generateImage(prompt, 1);
      const imageDataUrl = result?.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : null;
      
      if (imageDataUrl) {
        // Update UI state for immediate display
        setSceneData(prev => ({
          ...prev,
          [sceneId]: {
            ...prev[sceneId],
            generatedImage: imageDataUrl,
            revisedPrompt: result?.revisedPrompt || prompt
          }
        }));

        // Add to generated images array for next tab (no re-render)
        const filtered = generatedImagesRef.current.filter(img => img.sceneId !== sceneId);
        generatedImagesRef.current = [...filtered, {
          sceneId,
          revisedPrompt: result?.revisedPrompt || prompt,
          image: imageDataUrl
        }];
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert(`Error generating image for ${sceneId}: ${error.message}`);
      if (onError) onError(`Error generating image for ${sceneId}`);
    } finally {
      setSceneData(prev => ({
        ...prev,
        [sceneId]: {
          ...prev[sceneId],
          isGenerating: false
        }
      }));
    }
  };

  const handlePromptGenAll = async () => {
    if (isPromptGenAllRunning) return;
    setIsPromptGenAllRunning(true);
    
    try {
      for (const scene of originalImages) {
        await handlePromptAssistant(scene.sceneId);
      }
    } catch (error) {
      console.error("Error during PromptGen All:", error);
      if (onError) onError("An error occurred during Prompt Generation for all scenes.");
    } finally {
      setIsPromptGenAllRunning(false);
    }
  };

  const handleImageGenAll = async () => {
    if (isImageGenAllRunning) return;
    setIsImageGenAllRunning(true);
    
    try {
      for (const scene of originalImages) {
        await handleGenerate(scene.sceneId);
      }
    } catch (error) {
      console.error("Error during ImageGen All:", error);
      if (onError) onError("An error occurred during Image Generation for all scenes.");
    } finally {
      setIsImageGenAllRunning(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={onBackToScenes}
          className={styles.stepButton}
        >
          ← Back to Scenes
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
            onClick={handleImageGenAll}
            className={`${styles.actionButton} ${styles.imageGenButton} ${isImageGenAllRunning ? styles.disabled : ''}`}
            disabled={isImageGenAllRunning}
            title="Generate Images for All Scenes"
          >
            <FaImages /> {isImageGenAllRunning ? 'Generating Images...' : 'ImageGen All'}
          </button>
          <button
            onClick={handleSettingsClick}
            className={`${styles.actionButton} ${styles.settingsButton}`}
            title="Story Configuration"
          >
            <FaBookOpen />
            Story Context
          </button>
        </div>
        <button 
          onClick={() => onNext && onNext(
            generatedImagesRef.current,
            storyConfig,
          )}
          className={styles.stepButton}
        >
          Next Step →
        </button>
      </div>
      
      <div className={styles.rowsContainer}>
        {originalImages.map((item, index) => {
          const currentSceneData = sceneData[item.sceneId] || {};
          return (
            <SceneRow
              key={`${item.sceneId}-${index}`}
              sceneId={item.sceneId}
              originalImage={{
                imageUrl: item.imageUrl,
                title: item.title
              }}
              generatedImage={currentSceneData.generatedImage}
              generationHistory={[]} // Will be populated later
              storyConfig={storyConfig}
              prompt={currentSceneData.prompt || ''}
              isPromptAssistantRunning={currentSceneData.isPromptAssistantRunning || false}
              isGenerating={currentSceneData.isGenerating || false}
              onOriginalImageClick={handleOriginalImageClick}
              onGeneratedImageClick={handleGeneratedImageClick}
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

export default RemakeTab;
