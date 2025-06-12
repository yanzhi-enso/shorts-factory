"use client";

import { useState, useMemo, useRef } from 'react';
import { FaBookOpen, FaDownload } from "react-icons/fa";
import { FaMagic, FaImages } from 'react-icons/fa';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './RemakeTab.module.css';
import SceneRow from '../remake/SceneRow';
import FullSizeImageModal from '../common/FullSizeImageModal';
import StoryConfigModal from '../common/StoryConfigModal';
import Dropdown from '../common/Dropdown';
import { analyzeImage, generateImage } from '../../../services/backend';

const RemakeTab = ({
  projectId, images, selectedIndices,
  onBackToScenes, onNext, onError
}) => {
  // Image count options for dropdown
  const imageCountOptions = [
    { value: 1, label: '1 Image' },
    { value: 2, label: '2 Images' },
    { value: 3, label: '3 Images' },
    { value: 4, label: '4 Images' },
    { value: 5, label: '5 Images' }
  ];

  const [modalState, setModalState] = useState({
    isOpen: false,
    imageUrl: null,
    imageTitle: null
  });

  const [isPromptGenAllRunning, setIsPromptGenAllRunning] = useState(false);
  const [isImageGenAllRunning, setIsImageGenAllRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Global image count state
  const [globalImageCount, setGlobalImageCount] = useState(1);

  // Scene-specific state - now with image history
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
            imageHistory: [], // Array of {id, imageUrl, type, timestamp, prompt?, revisedPrompt?}
            selectedImageIndex: -1, // -1 for empty, 0+ for valid indices
              imageCount: 1, // Number of images to generate for this scene
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

  // Handle image upload from history modal
  const handleImageUpload = (sceneId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target.result;
      
      // Create new image history entry for uploaded image
      const newImageEntry = {
        id: `${sceneId}-upload-${Date.now()}`,
        imageUrl: imageDataUrl,
        type: 'uploaded',
        timestamp: new Date()
      };

      // Update scene data with new uploaded image in history
      setSceneData(prev => ({
        ...prev,
        [sceneId]: {
          ...prev[sceneId],
          imageHistory: [...(prev[sceneId]?.imageHistory || []), newImageEntry],
          selectedImageIndex: (prev[sceneId]?.imageHistory || []).length // Point to the new image (length will be correct after spread)
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle image selection from history modal
  const handleImageSelect = (sceneId, selectedIndex) => {
    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        selectedImageIndex: selectedIndex
      }
    }));
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

  // Handle global image count change - updates all scenes
  const handleGlobalImageCountChange = (newCount) => {
    setGlobalImageCount(newCount);
    
    // Update all existing scenes to use the new global count
    setSceneData(prev => {
      const updated = {};
      Object.keys(prev).forEach(sceneId => {
        updated[sceneId] = {
          ...prev[sceneId],
          imageCount: newCount
        };
      });
      return updated;
    });
  };

  // Handle individual scene image count change
  const handleSceneImageCountChange = (sceneId, newCount) => {
    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        imageCount: newCount
      }
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
    const imageCount = sceneData[sceneId]?.imageCount || 1;
    
    if (!scene?.imageUrl || !prompt || sceneData[sceneId]?.isGenerating) return;

    setSceneData(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        isGenerating: true
      }
    }));

    try {
      // Use scene-specific image count
      const result = await generateImage(prompt, imageCount);
      
      // Handle multiple images response
      if (result?.images && Array.isArray(result.images)) {
        // Multiple images returned
        const newImageEntries = result.images.map((imgData, index) => ({
          id: `${sceneId}-${Date.now()}-${index}`,
          imageUrl: `data:image/png;base64,${imgData.imageBase64}`,
          type: 'generated',
          timestamp: new Date(),
          prompt: prompt,
          revisedPrompt: imgData.revisedPrompt || result.revisedPrompt || prompt
        }));

        // Update scene data with all new images in history
        setSceneData(prev => ({
          ...prev,
          [sceneId]: {
            ...prev[sceneId],
            imageHistory: [...(prev[sceneId]?.imageHistory || []), ...newImageEntries],
            selectedImageIndex: (prev[sceneId]?.imageHistory || []).length + newImageEntries.length - 1 // Point to the last new image
          }
        }));

        // Add the last generated image to generated images array for next tab
        const lastImage = newImageEntries[newImageEntries.length - 1];
        const filtered = generatedImagesRef.current.filter(img => img.sceneId !== sceneId);
        generatedImagesRef.current = [...filtered, {
          sceneId,
          revisedPrompt: lastImage.revisedPrompt,
          image: lastImage.imageUrl
        }];
      } else if (result?.imageBase64) {
        // Single image returned (backward compatibility)
        const imageDataUrl = `data:image/png;base64,${result.imageBase64}`;
        
        const newImageEntry = {
          id: `${sceneId}-${Date.now()}`,
          imageUrl: imageDataUrl,
          type: 'generated',
          timestamp: new Date(),
          prompt: prompt,
          revisedPrompt: result?.revisedPrompt || prompt
        };

        // Update scene data with new image in history
        setSceneData(prev => ({
          ...prev,
          [sceneId]: {
            ...prev[sceneId],
            imageHistory: [...(prev[sceneId]?.imageHistory || []), newImageEntry],
            selectedImageIndex: (prev[sceneId]?.imageHistory || []).length // Point to the new image
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
      // Create promises for all scenes simultaneously
      const promptPromises = originalImages.map(scene => 
        handlePromptAssistant(scene.sceneId)
      );
      
      // Execute all in parallel and wait for all to complete/fail
      const results = await Promise.allSettled(promptPromises);
      
      // Handle any failures
      const failures = results
        .map((result, index) => ({ result, sceneId: originalImages[index].sceneId }))
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

  const handleImageGenAll = async () => {
    if (isImageGenAllRunning) return;
    setIsImageGenAllRunning(true);
    
    try {
      // Create promises for all scenes simultaneously
      const imagePromises = originalImages.map(scene => 
        handleGenerate(scene.sceneId)
      );
      
      // Execute all in parallel and wait for all to complete/fail
      const results = await Promise.allSettled(imagePromises);
      
      // Handle any failures
      const failures = results
        .map((result, index) => ({ result, sceneId: originalImages[index].sceneId }))
        .filter(({ result }) => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.error("Some image generations failed:", failures);
        if (onError) {
          const failedScenes = failures.map(f => f.sceneId).join(', ');
          onError(`Image generation failed for scenes: ${failedScenes}`);
        }
      }
    } catch (error) {
      console.error("Error during ImageGen All:", error);
      if (onError) onError("An unexpected error occurred during batch image generation.");
    } finally {
      setIsImageGenAllRunning(false);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    
    // Collect all selected images from scene data
    const selectedImages = [];
    Object.entries(sceneData).forEach(([sceneId, data]) => {
      const { imageHistory, selectedImageIndex } = data;
      if (selectedImageIndex >= 0 && selectedImageIndex < imageHistory.length) {
        const selectedImage = imageHistory[selectedImageIndex];
        selectedImages.push({
          sceneId,
          imageData: selectedImage
        });
      }
    });

    if (selectedImages.length === 0) {
      alert('No images to export. Please generate or upload some images first.');
      return;
    }

    setIsExporting(true);
    
    try {
      const zip = new JSZip();
      
      // Add each selected image to the zip
      for (const { sceneId, imageData } of selectedImages) {
        try {
          // Extract base64 data from data URL
          const base64Data = imageData.imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          
          // Add image to zip with scene-based filename
          const fileExtension = imageData.type === 'uploaded' ? 'png' : 'png';
          const filePrefix = imageData.type === 'uploaded' ? 'uploaded' : 'generated';
          zip.file(`${sceneId}_${filePrefix}.${fileExtension}`, base64Data, { base64: true });
        } catch (error) {
          console.error(`Error processing image for ${sceneId}:`, error);
        }
      }
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      saveAs(content, `remake_images_export_${timestamp}.zip`);
      
    } catch (error) {
      console.error('Error creating export:', error);
      if (onError) onError('Failed to export images. Please try again.');
    } finally {
      setIsExporting(false);
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
          <div className={styles.buttonWithDropdown}>
            <button
              onClick={handleImageGenAll}
              className={`${styles.actionButton} ${styles.imageGenButton} ${isImageGenAllRunning ? styles.disabled : ''}`}
              disabled={isImageGenAllRunning}
              title="Generate Images for All Scenes"
            >
              <FaImages /> {isImageGenAllRunning ? 'Generating Images...' : 'ImageGen All'}
            </button>
            <Dropdown
              value={globalImageCount}
              onChange={handleGlobalImageCountChange}
              disabled={isImageGenAllRunning}
              options={imageCountOptions}
            />
          </div>
          <button
            onClick={handleSettingsClick}
            className={`${styles.actionButton} ${styles.settingsButton}`}
            title="Story Configuration"
          >
            <FaBookOpen />
            Story Context
          </button>
        </div>
        <div className={styles.rightButtons}>
          <button
            onClick={handleExport}
            className={`${styles.actionButton} ${styles.exportButton} ${isExporting ? styles.disabled : ''}`}
            disabled={isExporting}
            title="Export Generated Images"
          >
            <FaDownload /> {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button 
            onClick={() => {
              // Collect selected images for next step
              const selectedImages = [];
              Object.entries(sceneData).forEach(([sceneId, data]) => {
                const { imageHistory, selectedImageIndex } = data;
                if (selectedImageIndex >= 0 && selectedImageIndex < imageHistory.length) {
                  const selectedImage = imageHistory[selectedImageIndex];
                  selectedImages.push({
                    sceneId,
                    revisedPrompt: selectedImage.revisedPrompt || selectedImage.prompt || '',
                    image: selectedImage.imageUrl
                  });
                }
              });
              
              if (onNext) {
                onNext(selectedImages, storyConfig);
              }
            }}
            className={styles.stepButton}
          >
            Next Step →
          </button>
        </div>
      </div>
      
      <div className={styles.rowsContainer}>
        {originalImages.map((item, index) => {
          const currentSceneData = sceneData[item.sceneId] || {};
          const imageHistory = currentSceneData.imageHistory || [];
          const selectedIndex = currentSceneData.selectedImageIndex ?? -1;
          const selectedImage = selectedIndex >= 0 && selectedIndex < imageHistory.length 
            ? imageHistory[selectedIndex] 
            : null;

          return (
            <SceneRow
              key={`${item.sceneId}-${index}`}
              sceneId={item.sceneId}
              originalImage={{
                imageUrl: item.imageUrl,
                title: item.title
              }}
              selectedImage={selectedImage}
              imageHistory={imageHistory}
              selectedImageIndex={selectedIndex}
              storyConfig={storyConfig}
              prompt={currentSceneData.prompt || ''}
              imageCount={currentSceneData.imageCount || 1}
              isPromptAssistantRunning={currentSceneData.isPromptAssistantRunning || false}
              isGenerating={currentSceneData.isGenerating || false}
              onOriginalImageClick={handleOriginalImageClick}
              onGeneratedImageClick={handleGeneratedImageClick}
              onPromptChange={handlePromptChange}
              onPromptAssistant={handlePromptAssistant}
              onGenerate={handleGenerate}
              onImageUpload={handleImageUpload}
              onImageSelect={handleImageSelect}
              onImageCountChange={handleSceneImageCountChange}
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
