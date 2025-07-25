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
import AddSceneButton from 'app/components/remake/AddSceneButton/AddSceneButton';
import ReferenceImageSelectionModal from 'app/components/common/ReferenceImageSelectionModal';
import SceneGenHistoryModal from 'app/components/remake/SceneGenHistoryModal';

const RemakeTab = ({ onBackToScenes, onNext, onError, onSettingsClick }) => {
    const { projectState } = useProjectManager();

    const [isExporting, setIsExporting] = useState(false);
    const [referenceModalState, setReferenceModalState] = useState({
        isOpen: false,
        scene: null,
    });
    const [sceneHistoryModal, setSceneHistoryModal] = useState({
        isOpen: false,
        scene: null,
    });

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
            .map((scene, index) => {
                const selectedImageData = scene.generatedImages.find(
                    (img) => img.id === scene.selectedGeneratedImageId
                );
                const currentImageUrl = selectedImageData.gcsUrls[selectedImageData.selectedImageIdx] || selectedImageData.gcsUrls[0];
                
                return {
                    sceneDisplayName: `Scene-${index + 1}`, // Dynamic display name
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
            for (const { sceneDisplayName, imageUrl, imageType } of selectedImages) {
                try {
                    // Extract base64 data from data URL
                    const base64Data = imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');

                    // Add image to zip with scene-based filename
                    const filePrefix = imageType === 'uploaded' ? 'uploaded' : 'generated';
                    zip.file(`${sceneDisplayName}_${filePrefix}.png`, base64Data, { base64: true });
                } catch (error) {
                    console.error(`Error processing image for ${sceneDisplayName}:`, error);
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

    // Modal handlers
    const handleReferenceImageClick = (scene) => {
        console.log("handleReferenceImageClick is triggered")
        setReferenceModalState({
            isOpen: true,
            scene: scene,
        });
    };

    const closeModal = () => {
        setReferenceModalState({
            isOpen: false,
            scene: null,
        });
    };

    const handleOpenHistoryModal = (scene) => {
        setSceneHistoryModal({
            isOpen: true,
            scene: scene,
        });
    };

    const handleCloseHistoryModal = () => {
        setSceneHistoryModal({
            isOpen: false,
            scene: null,
        });
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
            .map((scene, index) => {
                const sceneDisplayName = `Scene-${index + 1}`; // Dynamic display name
                const selectedImageData = scene.generatedImages.find(
                    (img) => img.id === scene.selectedGeneratedImageId
                );
                const currentImageUrl = selectedImageData.gcsUrls[selectedImageData.selectedImageIdx] || selectedImageData.gcsUrls[0];
                
                return {
                    sceneId: scene.id, // UUID for data consistency
                    sceneDisplayName, // For display purposes
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

            {/* Add Scene Button */}
            <div className={styles.elementListContainer}>
                <ElementImageList />
            </div>

            <div className={styles.rowsContainer}>
                <AddSceneButton insertAfterScene={null} insertBeforeScene={selectedScenes[0]} />
                {selectedScenes.length > 0 &&
                    selectedScenes.map((scene, index) => (
                        <div key={scene.id} className={styles.sceneRow}>
                            {/* Scene Row */}
                            <SceneRow
                                scene={scene}
                                sceneIndex={index}
                                storyConfig={storyConfig}
                                onReferenceImageClick={handleReferenceImageClick}
                                onOpenHistoryModal={handleOpenHistoryModal}
                            />

                            {/* Add Scene Button */}
                            <AddSceneButton
                                insertAfterScene={scene[index]}
                                insertBeforeScene={
                                    index + 1 < scene.length ? scene[index + 1] : null
                                }
                            />
                        </div>
                    ))}
            </div>

            <ElementGenModal />

            <ReferenceImageSelectionModal
                isOpen={referenceModalState.isOpen}
                onClose={closeModal}
                scene={referenceModalState.scene}
            />

            <SceneGenHistoryModal
                isOpen={sceneHistoryModal.isOpen}
                onClose={handleCloseHistoryModal}
                scene={sceneHistoryModal.scene}
            />
        </div>
    );
};

export default RemakeTab;
