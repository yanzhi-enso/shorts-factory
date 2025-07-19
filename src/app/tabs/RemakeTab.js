"use client";

import { useState, useMemo } from 'react';
import { FaBookOpen, FaDownload } from 'react-icons/fa';
import { FaMagic, FaImages } from 'react-icons/fa';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './RemakeTab.module.css';
import { useProjectManager } from 'projectManager/useProjectManager';
import SceneRow from 'app/components/remake/SceneRow/SceneRow';
import ElementImageList from 'app/components/remake/ElementList/ElementImageList';
import ElementGenModal from 'app/components/remake/ElementGenModal';

const RemakeTab = ({ onBackToScenes, onNext, onError, onSettingsClick }) => {
    const { projectState } = useProjectManager();

    const [isExporting, setIsExporting] = useState(false);

    // Get selected scenes from ProjectManager
    const selectedScenes = useMemo(
        () => (projectState.scenes || []).filter((scene) => scene.isSelected),
        [projectState.scenes]
    );

    // Get story config from ProjectManager
    const storyConfig = projectState.currentProject?.settings || {};

    // Empty bulk operation handlers (to be implemented later)
    const handlePromptGenAll = () => {
        console.log('Bulk prompt generation not implemented yet');
    };

    const handleImageGenAll = () => {
        console.log('Bulk image generation not implemented yet');
    };

    const handleExport = async () => {
        if (isExporting) return;

        // Collect all selected generated images from ProjectManager scenes using new structure
        const selectedImages = selectedScenes
            .filter((scene) => {
                // Check if scene has a selected generated image
                const selectedImageData = scene.generatedImages?.find(
                    (img) => img.id === scene.selectedGeneratedImageId
                );
                return selectedImageData && selectedImageData.gcsUrls?.length > 0;
            })
            .map((scene) => {
                const selectedImageData = scene.generatedImages.find(
                    (img) => img.id === scene.selectedGeneratedImageId
                );
                const currentImageUrl = selectedImageData.gcsUrls[selectedImageData.selectedImageIdx] || selectedImageData.gcsUrls[0];
                
                return {
                    sceneId: `Scene-${scene.sceneOrder / 100}`,
                    imageUrl: currentImageUrl,
                    imageType: selectedImageData.generationSources ? 'generated' : 'uploaded',
                };
            });

        if (selectedImages.length === 0) {
            alert('No images to export. Please generate or upload some images first.');
            return;
        }

        setIsExporting(true);

        try {
            const zip = new JSZip();

            // Add each selected image to the zip
            for (const { sceneId, imageUrl, imageType } of selectedImages) {
                try {
                    // Extract base64 data from data URL
                    const base64Data = imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');

                    // Add image to zip with scene-based filename
                    const filePrefix = imageType === 'uploaded' ? 'uploaded' : 'generated';
                    zip.file(`${sceneId}_${filePrefix}.png`, base64Data, { base64: true });
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

    const handleNext = () => {
        // Collect selected images for next step using new structure
        const selectedImages = selectedScenes
            .filter((scene) => {
                // Check if scene has a selected generated image
                const selectedImageData = scene.generatedImages?.find(
                    (img) => img.id === scene.selectedGeneratedImageId
                );
                return selectedImageData && selectedImageData.gcsUrls?.length > 0;
            })
            .map((scene) => {
                const sceneId = `Scene-${scene.sceneOrder / 100}`;
                const selectedImageData = scene.generatedImages.find(
                    (img) => img.id === scene.selectedGeneratedImageId
                );
                const currentImageUrl = selectedImageData.gcsUrls[selectedImageData.selectedImageIdx] || selectedImageData.gcsUrls[0];
                
                return {
                    sceneId,
                    revisedPrompt:
                        selectedImageData?.generationSources?.revisedPrompt ||
                        selectedImageData?.generationSources?.prompt ||
                        '',
                    image: currentImageUrl,
                };
            });

        if (onNext) {
            onNext(selectedImages, storyConfig);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={onBackToScenes} className={styles.stepButton}>
                    ← Back to Scenes
                </button>
                <div className={styles.centerButtons}>
                    <button
                        onClick={onSettingsClick}
                        className={`${styles.actionButton} ${styles.settingsButton}`}
                        title='Story Configuration'
                    >
                        <FaBookOpen />
                        Story Context
                    </button>
                    <button
                        onClick={handlePromptGenAll}
                        className={`${styles.actionButton} ${styles.promptButton}`}
                        title='Generate Prompts for All Scenes'
                    >
                        <FaMagic /> PromptGen All
                    </button>
                    <button
                        onClick={handleImageGenAll}
                        className={`${styles.actionButton} ${styles.imageGenButton}`}
                        title='Generate Images for All Scenes'
                    >
                        <FaImages /> ImageGen All
                    </button>
                </div>
                <div className={styles.rightButtons}>
                    <button
                        onClick={handleExport}
                        className={`${styles.actionButton} ${styles.exportButton} ${
                            isExporting ? styles.disabled : ''
                        }`}
                        disabled={isExporting}
                        title='Export Generated Images'
                    >
                        <FaDownload /> {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                    <button onClick={handleNext} className={styles.stepButton}>
                        Next Step →
                    </button>
                </div>
            </div>

            <div className={styles.rowsContainer}>
                <ElementImageList/>
                {selectedScenes.map((scene) => (
                    <SceneRow key={scene.id} scene={scene} storyConfig={storyConfig} />
                ))}
            </div>

            <ElementGenModal />
        </div>
    );
};

export default RemakeTab;
